import React, { useRef, useEffect } from 'react';
import './Video.css';

function Video({ stream, muted, autoPlay }) {
    const videoRef = useRef(null);
    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return <video ref={videoRef} autoPlay={autoPlay} muted={muted} playsInline />;
}

export default Video;
