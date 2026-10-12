import { Response } from 'express';
import { logger } from '../../utils/logger';

export class RealtimeBroadcaster {
  private static instance: RealtimeBroadcaster;
  private clients: Response[] = [];

  public static getInstance(): RealtimeBroadcaster {
    if (!RealtimeBroadcaster.instance) {
      RealtimeBroadcaster.instance = new RealtimeBroadcaster();
    }
    return RealtimeBroadcaster.instance;
  }

  public addClient(res: Response): void {
    this.clients.push(res);
    logger.info(`New SSE client connected. Active clients: ${this.clients.length}`);

    res.on('close', () => {
      this.clients = this.clients.filter(c => c !== res);
      logger.info(`SSE client disconnected. Active clients: ${this.clients.length}`);
    });
  }

  public broadcast(event: string, data: any): void {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    this.clients.forEach(client => {
      try {
        client.write(payload);
      } catch (err: any) {
        logger.error(`Error sending SSE event: ${err.message}`);
      }
    });
  }
}
