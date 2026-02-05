import { Composition } from "remotion";
import { SimpleVideo } from "./compositions/SimpleVideo";

export const MyVideo = () => {
    return (
        <>
            <Composition
                id="SimpleVideo"
                component={SimpleVideo}
                durationInFrames={300}
                fps={30}
                width={1080}
                height={1920}
                defaultProps={{
                    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
                    muted: false,
                }}
            />
        </>
    );
};
