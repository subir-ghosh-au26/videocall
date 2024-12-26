import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import Video from './Video';
import './Room.css';

const socket = io('https://videocall-viic.onrender.com');

function Room({ roomId }) {
    const [myStream, setMyStream] = useState(null);
    const [remoteStreams, setRemoteStreams] = useState({});
    const [userId, setUserId] = useState(null);
    const [roomClients, setRoomClients] = useState([]);
    const peers = useRef({});


    useEffect(() => {
        socket.on('connect', () => {
            setUserId(socket.id);
        })

        socket.on('room-clients', (clients) => {
            setRoomClients(clients)
        })

        socket.on('new-user', (newUserId) => {
            console.log(`New user joined ${newUserId}`)
            startCall(newUserId)
        })

        socket.on('offer', (payload) => {
            console.log(`Offer from ${payload.sender}`);
            handleOffer(payload);
        })

        socket.on('answer', (payload) => {
            console.log(`Answer from ${payload.sender}`);
            handleAnswer(payload);
        })

        socket.on('ice-candidate', (payload) => {
            console.log(`ice-candidate from ${payload.sender}`);
            handleIceCandidate(payload);
        });

        socket.on('user-disconnected', (userId) => {
            console.log(`User ${userId} disconnected`);
            handleUserDisconnect(userId)
        });
    }, []);


    useEffect(() => {
        if (roomId) {
            getMedia();
            socket.emit('join', roomId);
            setRemoteStreams({}); //Clear previous remote videos
        }
    }, [roomId]);


    const getMedia = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setMyStream(stream);
        } catch (error) {
            console.error('Error accessing media:', error);
        }
    };


    const startCall = async (target) => {
        console.log(`starting call with ${target}`)
        const peerConnection = new RTCPeerConnection({
            iceServers: [{
                urls: ['stun:stun.l.google.com:19302',
                    'stun:stun1.l.google.com:19302']
            }]
        });
        peers.current[target] = peerConnection;

        if (myStream) myStream.getTracks().forEach((track) => peerConnection.addTrack(track, myStream));


        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice-candidate', {
                    target,
                    candidate: event.candidate,
                    sender: userId
                });
            }
        };

        peerConnection.ontrack = (event) => {
            setRemoteStreams(prevStreams => ({
                ...prevStreams,
                [target]: event.streams[0]
            }))
        };

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('offer', {
            target,
            offer,
            sender: userId
        });
    };

    const handleOffer = async (payload) => {
        const { offer, sender } = payload;
        const peerConnection = new RTCPeerConnection({
            iceServers: [{
                urls: ['stun:stun.l.google.com:19302',
                    'stun:stun1.l.google.com:19302']
            }]
        });
        peers.current[sender] = peerConnection;

        if (myStream) myStream.getTracks().forEach((track) => peerConnection.addTrack(track, myStream));


        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice-candidate', {
                    target: sender,
                    candidate: event.candidate,
                    sender: userId
                });
            }
        };

        peerConnection.ontrack = (event) => {
            setRemoteStreams(prevStreams => ({
                ...prevStreams,
                [sender]: event.streams[0]
            }))
        };

        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        socket.emit('answer', {
            target: sender,
            answer,
            sender: userId
        });
    };


    const handleAnswer = async (payload) => {
        const { answer, sender } = payload;
        const peerConnection = peers.current[sender];
        if (peerConnection) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        }
    };


    const handleIceCandidate = async (payload) => {
        const { candidate, sender } = payload;
        const peerConnection = peers.current[sender];
        if (peerConnection) {
            try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            }
            catch (e) {
                console.log("Error adding ice", e)
            }

        }
    };

    const handleUserDisconnect = (userId) => {
        setRemoteStreams(prevStreams => {
            const newStreams = { ...prevStreams };
            delete newStreams[userId];
            return newStreams;
        });
        if (peers.current[userId]) {
            peers.current[userId].close();
            delete peers.current[userId];
        }
    }


    return (
        <div className="room">
            <h2>Room: {roomId}</h2>

            <h2>My Video</h2>
            {myStream && (
                <Video stream={myStream} muted autoPlay />
            )}

            <h2>Room Users</h2>
            <ul>
                {roomClients.map((client) => (
                    <li key={client}>{client === userId ? "Me" : client}</li>
                ))}
            </ul>
            <h2>Remote Videos</h2>
            <div className="remote-videos">
                {Object.entries(remoteStreams).map(([key, stream]) => (
                    <div key={key}>
                        <Video stream={stream} autoPlay />
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Room;
