import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

type BatchRow = {
  id: string;
  name: string;
  created: string;
  conversations: number;
  avgScore: number;
  flagged: number;
  status: string;
  tone: 'good' | 'warning' | 'danger' | 'info';
};

@Component({
  selector: 'app-batches',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './batches.component.html',
  styleUrls: ['./batches.component.css']
})
export class BatchesComponent {
  readonly batches: BatchRow[] = [
    { id: 'oct-support-logs', name: 'Nov Support Logs', created: 'Nov 28, 2023', conversations: 1240, avgScore: 92.4, flagged: 12, status: 'Complete', tone: 'good' },
    { id: 'q3-sales-inquiries', name: 'Q3 Sales Inquiries', created: 'Nov 25, 2023', conversations: 8500, avgScore: 78.1, flagged: 145, status: 'Processing (45%)', tone: 'info' },
    { id: 'beta-user-feedback', name: 'Beta User Feedback', created: 'Nov 20, 2023', conversations: 450, avgScore: 95.8, flagged: 2, status: 'Complete', tone: 'good' },
    { id: 'api-error-logs-v2', name: 'API Error Logs v2', created: 'Nov 18, 2023', conversations: 3200, avgScore: 42.3, flagged: 890, status: 'Failed', tone: 'danger' },
    { id: 'nov-chat-batch', name: 'Oct Email Batch', created: 'Oct 31, 2023', conversations: 12050, avgScore: 88.9, flagged: 340, status: 'Complete', tone: 'good' }
  ];

  constructor(private router: Router) {}

  openBatch(batch: BatchRow) {
    this.router.navigate(['/batches', batch.id]);
  }
}
