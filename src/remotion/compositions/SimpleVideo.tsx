import { AbsoluteFill, Video } from "remotion";

export const SimpleVideo = ({
    videoUrl,
    muted,
    volume,
    startFrom,
    endAt
}: {
    videoUrl: string,
    muted?: boolean,
    volume?: number,
    startFrom?: number,
    endAt?: number
}) => {
    return (
        <AbsoluteFill>
            <Video
                src={videoUrl}
                muted={muted}
                volume={volume}
                startFrom={startFrom}
                endAt={endAt}
            />
        </AbsoluteFill>
    );
};
