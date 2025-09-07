import {
  MediaStream,
  RTCPeerConnection,
  RTCSessionDescription,
  mediaDevices,
} from 'react-native-webrtc';

export class PeerHandler {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;

  //@ts-ignore
  constructor(private socket: Socket) {}

  /**
   * ✅ Get camera + mic
   */
  async initLocalStream(): Promise<MediaStream> {
    const stream = await mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    this.localStream = stream;
    return stream;
  }

  /**
   * ✅ Start call (createOffer)
   */
  async callUser(userToCall: string, from: string, name: string) {
    this.createPeerConnection();

    // Add local tracks
    this.localStream?.getTracks().forEach((track) => {
      this.peerConnection?.addTrack(track, this.localStream!);
    });

    const offer = await this.peerConnection?.createOffer();
    if (!offer) return;
    await this.peerConnection?.setLocalDescription(offer);

    this.socket.emit('callUser', {
      userToCall,
      signalData: offer,
      from,
      name,
    });
  }

  /**
   * ✅ Answer call (createAnswer)
   */
  async answerCall(to: string, offer: any) {
    this.createPeerConnection();

    // Add local tracks
    this.localStream?.getTracks().forEach((track) => {
      this.peerConnection?.addTrack(track, this.localStream!);
    });

    await this.peerConnection?.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await this.peerConnection?.createAnswer();
    if (!answer) return;
    await this.peerConnection?.setLocalDescription(answer);

    this.socket.emit('answerCall', { to, signal: answer });
  }

  /**
   * ✅ Handle remote answer
   */
  async handleAnswer(answer: any) {
    if (!this.peerConnection) return;
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  }

  /**
   * ✅ Create peer connection + ICE candidates
   */
  private createPeerConnection() {
    if (this.peerConnection) return this.peerConnection;

    this.peerConnection = new RTCPeerConnection();

    // Collect ICE candidates
    //@ts-ignore
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('candidate', event.candidate);
      }
    };

    // Handle remote track
    //@ts-ignore
    this.peerConnection.ontrack = (event) => {
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
      }
      this.remoteStream.addTrack(event.track);
    };

    return this.peerConnection;
  }

  /**
   * ✅ Expose streams
   */
  getLocalStream() {
    return this.localStream;
  }

  getRemoteStream() {
    return this.remoteStream;
  }
}
