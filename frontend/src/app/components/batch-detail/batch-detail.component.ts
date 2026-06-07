import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-batch-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './batch-detail.component.html',
  styleUrls: ['./batch-detail.component.css']
})
export class BatchDetailComponent {
  readonly id = this.route.snapshot.paramMap.get('id') || 'oct-support-logs';
  readonly isHealthy = this.id.includes('nov-chat');

  readonly failedRows = [
    ['CONV-8821', 'Oct 24, 14:32', 'Wrong refund policy cited', 'AI_Support_V2', '32/100', 'POLICY'],
    ['CONV-8794', 'Oct 24, 11:15', 'No escalation when customer frustr...', 'AI_Support_V2', '45/100', 'ESCALATION'],
    ['CONV-8750', 'Oct 23, 16:40', 'Provided incorrect warranty duration', 'AI_Support_V1.5', '51/100', 'POLICY']
  ];

  readonly healthyRows = [
    ['#C-8921', '"I cannot access my billing portal since yesterday..."', '45', 'Failed Resolution', 'Pending'],
    ['#C-8922', '"How do I upgrade my team plan to include more seats?"', '98', '-', 'Pending'],
    ['#C-8923', '"The API rate limit is throwing 429s prematurely."', '72', 'Tone Warning', 'Pending'],
    ['#C-8924', '"Cancel my subscription immediately."', '100', '-', 'Pending']
  ];

  constructor(private route: ActivatedRoute, private router: Router) {}

  openConversation() {
    this.router.navigate(['/conversations/conv_047']);
  }
}
