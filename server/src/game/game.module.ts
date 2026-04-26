import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { RoomService } from './room.service';
import { LlmService } from './llm.service';

@Module({
  imports: [ConfigModule.forRoot()],
  providers: [GameGateway, GameService, RoomService, LlmService],
})
export class GameModule {}
