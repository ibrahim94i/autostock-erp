import { Module } from '@nestjs/common';
import { ExpensesModule } from '../expenses/expenses.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [ExpensesModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
