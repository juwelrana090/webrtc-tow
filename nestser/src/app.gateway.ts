import {
    WebSocketGateway,
    SubscribeMessage,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface SignalData {
    type: string;
    data: any;
}

interface CallUserPayload {
    userToCall: string;
    signalData: SignalData;
    from: string;
    name: string;
}

interface AnswerCallPayload {
    to: string | string[];
    signal: any;
}

interface LeaveCallPayload {
    to: string | string[];
}

@WebSocketGateway({
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    handleConnection(client: Socket) {
        console.log('A user connected:', client.id);
        client.emit('me', client.id);
    }

    handleDisconnect(client: Socket) {
        console.log('User disconnected:', client.id);
        client.broadcast.emit('callEnded');
    }

    private async emitMessage(
        recipients: string | string[],
        event: string,
        data: any
    ): Promise<void> {
        if (Array.isArray(recipients)) {
            await Promise.all(recipients.map((id) => this.server.to(id).emit(event, data)));
        } else {
            this.server.to(recipients).emit(event, data)
        }
    }

    @SubscribeMessage('callUser')
    async handleCallUser(client: Socket, payload: CallUserPayload) {
        console.log('Call user:', payload?.userToCall);
        console.log('Call signal:', payload.signalData);
        console.log('Call from:', payload.from);
        console.log('Call name:', payload.name);

        await this.emitMessage(payload.userToCall, 'callUser', {
            signal: payload.signalData,
            from: payload.from,
            name: payload.name,
        });
    }

    @SubscribeMessage('answerCall')
    async handleAnswerCall(client: Socket, payload: AnswerCallPayload) {
        console.log('Answer call:', payload);
        await this.emitMessage(payload.to, 'callAccepted', payload.signal);
    }

    @SubscribeMessage('leaveCall')
    async handleLeaveCall(client: Socket, payload: LeaveCallPayload) {
        console.log('Call ended to:', payload.to);
        await this.emitMessage(payload.to, 'leaveCall', null);
    }
}
