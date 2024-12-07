import {
  TranscribeStreamingClient,
  StartStreamTranscriptionCommand,
} from '@aws-sdk/client-transcribe-streaming';
import axios from 'axios';
import {
  MediaSampleRateHertz,
  targetChunkSize,
  chunkInterval,
  emptyChunkInterval,
} from '../utils/constants.js';
import { finished } from 'stream/promises';

class AwsTranscribeService {
  constructor(region, accessKeyId, secretAccessKey, roomManager) {
    this.client = new TranscribeStreamingClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
    // RoomManager 의존성 주입
    this.roomManager = roomManager;
  }
  async startTranscribe(roomName, wsServer) {
    console.log(`[Transcribe] Starting session for room: ${roomName}`);

    const audioStream = this.roomManager.getAudioStream(roomName);
    const abortController = this.roomManager.getAbortController(roomName);

    const params = {
      LanguageCode: 'ko-KR',
      MediaEncoding: 'pcm',
      MediaSampleRateHertz,
      AudioStream: this.createAsyncIterator(audioStream),
    };

    const command = new StartStreamTranscriptionCommand(params);

    try {
      const response = await this.client.send(command, {
        signal: abortController.signal,
      });

      for await (const event of response.TranscriptResultStream) {
        const results = event.TranscriptEvent?.Transcript?.Results || [];
        results.forEach(result => {
          if (!result.IsPartial) {
            const transcript = result.Alternatives[0]?.Transcript || '';
            console.log(
              `[Transcribe] Final Transcript for room ${roomName}: ${transcript}`
            );
            wsServer.to(roomName).emit('transcript', transcript);

            axios
              .post(process.env.AI_RECOMMENDATIONS, {
                room_number: roomName,
                sentence: transcript,
              })
              .then(response => {
                const recommendations = response.data.recommendations;
                wsServer.to(roomName).emit('recommendations', recommendations);
              })
              .catch(error => {
                console.error(
                  `[AI Server] Error fetching recommendations: ${error.message}`
                );
              });
          }
        });
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(`[Transcribe] Session aborted for room: ${roomName}`);
      } else if (error.code === 'ERR_STREAM_PREMATURE_CLOSE') {
        console.warn(
          `[Transcribe] Stream closed prematurely for room: ${roomName}`
        );
      } else {
        console.error(`[Transcribe] Error for room ${roomName}:`, error);
      }
    } finally {
      console.log(`[Transcribe] Ending session for room: ${roomName}`);
      this.roomManager.removeRoom(roomName);
    }

    audioStream.end(() => {
      console.log(
        `[Transcribe] Audio stream fully ended for room: ${roomName}`
      );
    });
  }

  // PassThrough를 async iterable로 변환
  createAsyncIterator(stream) {
    const reader = stream[Symbol.asyncIterator]
      ? stream[Symbol.asyncIterator]()
      : this.convertToAsyncIterable(stream);

    return (async function* () {
      let lastDataTime = Date.now();
      const emptyChunk = Buffer.alloc(targetChunkSize); // 4KB의 빈 오디오 청크

      for await (const chunk of reader) {
        lastDataTime = Date.now(); // 마지막 데이터 수신 시간 갱신
        yield { AudioEvent: { AudioChunk: chunk } };
        // 빈 청크 전송을 일정 간격으로 보장
        while (Date.now() - lastDataTime >= emptyChunkInterval) {
          yield { AudioEvent: { AudioChunk: emptyChunk } };
          lastDataTime = Date.now();
        }
        // 오디오 데이터 전송 후 적절한 딜레이 적용
        await new Promise(resolve => setTimeout(resolve, chunkInterval)); // 오디오 전송 간격 설정
      }

      console.log('[Transcribe] Stream ended, sending final empty audio chunk');
      yield { AudioEvent: { AudioChunk: emptyChunk } };
    })();
  }

  // ReadableStream을 async iterable로 변환
  convertToAsyncIterable(stream) {
    return {
      async next() {
        return new Promise((resolve, reject) => {
          stream.once('data', chunk => resolve({ value: chunk, done: false }));
          stream.once('end', () => resolve({ done: true }));
          stream.once('error', err => reject(err));
        });
      },
      [Symbol.asyncIterator]() {
        return this;
      },
    };
  }

  async stopTranscribe(roomName) {
    if (this.roomManager.isStopping(roomName)) {
      console.log(
        `[Transcribe] Stop already in progress for room: ${roomName}`
      );
      return;
    }

    this.roomManager.setStopping(roomName);

    const stream = this.roomManager.getAudioStream(roomName);
    const abortController = this.roomManager.getAbortController(roomName);

    if (stream && !stream.destroyed && !stream.writableEnded) {
      try {
        console.log(
          `[Transcribe] Sending final empty audio chunk for room: ${roomName}`
        );
        stream.write(Buffer.alloc(4096)); // 빈 청크 전송
        stream.end();

        // 일정 시간 지연 후 스트림 종료 확인
        await new Promise(resolve => setTimeout(resolve, 500));
        await finished(stream);
        console.log(
          `[Transcribe] Audio stream fully closed for room: ${roomName}`
        );
      } catch (error) {
        console.error(
          `[Transcribe] Error during stream closure: ${error.message}`
        );
      }
    }

    if (abortController) {
      setImmediate(() => {
        try {
          console.log(
            `[Transcribe] Aborting Transcribe session for room: ${roomName}`
          );
          abortController.abort();
        } catch (error) {
          console.warn(
            `[Transcribe] Error aborting Transcribe: ${error.message}`
          );
        }
      });
    }

    this.roomManager.removeRoom(roomName);
    this.roomManager.clearStopping(roomName);
    console.log(`[Transcribe] Stopped session for room: ${roomName}`);
  }
}

export default AwsTranscribeService;
