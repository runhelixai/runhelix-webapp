import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

const ffmpeg = new FFmpeg();

export async function trimVideo(videoUrl: string, startTime: number, endTime: number): Promise<string> {
  try {
    if (!ffmpeg.loaded) {
      await ffmpeg.load();
    }

    const inputName = 'input.mp4';
    const outputName = 'trimmed.mp4';

    // Fetch the video file
    const response = await fetch(videoUrl);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    
    // Write the file to FFmpeg's virtual filesystem
    await ffmpeg.writeFile(inputName, data);

    // Run FFmpeg command to trim the video
    await ffmpeg.exec([
      '-ss', startTime.toString(),
      '-to', endTime.toString(),
      '-i', inputName,
      '-c', 'copy',
      outputName
    ]);

    // Read the result
    const outputData = await ffmpeg.readFile(outputName);
    
    // Clean up
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);

    // Create a blob URL for the trimmed video
    const outputBlob = new Blob([outputData as BlobPart], { type: 'video/mp4' });
    return URL.createObjectURL(outputBlob);
  } catch (error) {
    console.error('Error trimming video:', error);
    // Return original URL if trimming fails
    return videoUrl;
  }
}
