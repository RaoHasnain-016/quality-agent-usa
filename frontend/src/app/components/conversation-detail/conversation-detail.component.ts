import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { WorkspaceSidebarComponent } from '../workspace-sidebar/workspace-sidebar.component';

@Component({
  selector: 'app-conversation-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, WorkspaceSidebarComponent],
  templateUrl: './conversation-detail.component.html',
  styleUrls: ['./conversation-detail.component.css']
})
export class ConversationDetailComponent implements OnInit {
  readonly id = this.route.snapshot.paramMap.get('id') || '';
  conversation: any = null;
  notice = '';
  scores: any[] = [];

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  async ngOnInit() {
    await this.load();
  }

  async load() {
    try {
      this.conversation = await this.api.getConversationDetail(this.id);
      this.scores = [
        ['Accuracy', this.conversation.accuracyScore, this.tone(this.conversation.accuracyScore)],
        ['Policy Compliance', this.conversation.policyScore, this.tone(this.conversation.policyScore)],
        ['Resolution', this.conversation.resolutionScore, this.tone(this.conversation.resolutionScore)],
        ['Tone & Empathy', this.conversation.toneScore, this.tone(this.conversation.toneScore)],
        ['Escalation Mgt', this.conversation.escalationScore, this.tone(this.conversation.escalationScore)]
      ];
    } catch (error: any) {
      this.notice = error?.error?.error || 'Unable to load conversation.';
    }
  }

  async markReviewed() {
    this.conversation = await this.api.reviewConversation(this.id);
    this.notice = 'Conversation marked as reviewed.';
  }

  async overrideScore() {
    const value = window.prompt('Enter the corrected score from 0 to 100:', String(this.conversation?.overallScore ?? 70));
    if (value === null) return;
    const score = Number(value);
    if (!Number.isFinite(score) || score < 0 || score > 100) return this.notice = 'Score must be between 0 and 100.';
    const note = window.prompt('Add a short reason for this override:', 'Human QA review') || '';
    this.conversation = await this.api.overrideConversation(this.id, score, note);
    this.notice = 'Score override saved to MongoDB.';
  }

  private tone(score: number) {
    return score >= 80 ? 'good' : score >= 60 ? 'warn' : 'bad';
  }
}
