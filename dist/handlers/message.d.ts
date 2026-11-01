import { Message } from 'discord.js';
declare function shouldRespond(message: Message): boolean;
declare function queueMessage(message: Message): Promise<void>;
declare function handleMessage(message: Message): Promise<void>;
export { queueMessage, shouldRespond, handleMessage };
//# sourceMappingURL=message.d.ts.map