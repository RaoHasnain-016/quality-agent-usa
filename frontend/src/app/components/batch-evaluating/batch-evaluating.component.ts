import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { WorkspaceSidebarComponent } from '../workspace-sidebar/workspace-sidebar.component';

@Component({
  selector: 'app-batch-evaluating',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, WorkspaceSidebarComponent],
  templateUrl: './batch-evaluating.component.html',
  styleUrls: ['./batch-evaluating.component.css']
})
export class BatchEvaluatingComponent {
  readonly rows = [
    ['ID-8921A', 'Pass', 'Agent successfully resolved billing dispute with refund.'],
    ['ID-8920B', 'Flagged', 'Customer expressed frustration; agent response lacked empathy.'],
    ['ID-8919C', 'Pass', 'Routine password reset handled accurately.'],
    ['ID-8918D', 'Fail', 'Agent provided incorrect API endpoint documentation.']
  ];
}
