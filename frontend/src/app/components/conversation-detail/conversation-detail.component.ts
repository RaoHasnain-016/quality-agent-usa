import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-conversation-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './conversation-detail.component.html',
  styleUrls: ['./conversation-detail.component.css']
})
export class ConversationDetailComponent {
  readonly scores = [
    ['Accuracy', 9, 'good'],
    ['Policy Compliance', 0, 'bad'],
    ['Resolution', 2, 'warn'],
    ['Tone & Empathy', 7, 'good'],
    ['Escalation Mgt', 4, 'warn']
  ];
}
