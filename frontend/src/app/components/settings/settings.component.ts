import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AppTheme, ThemeService } from '../../services/theme.service';
import { WorkspaceSidebarComponent } from '../workspace-sidebar/workspace-sidebar.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, WorkspaceSidebarComponent],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  section = 'workspace';
  loading = true;
  saving = false;
  message = '';
  error = '';
  form: any = {
    company: '', displayName: '', email: '', timezone: 'Asia/Karachi', theme: 'midnight',
    alertEmail: '', alertThreshold: 70, companyPolicy: '', dataRetentionDays: 90,
    notificationsEnabled: true, weeklyDigest: true, requireReviewForFlagged: true
  };
  members: any[] = [];
  memberUsage: any = { used: 0, limit: 2, remaining: 2, planName: 'Free' };
  invite = { name: '', email: '', role: 'reviewer' };
  health: any = { integrations: {} };
  readonly roles = ['admin', 'analyst', 'reviewer', 'viewer'];
  readonly themes: { id: AppTheme; name: string; description: string; swatches: string[] }[] = [
    { id: 'midnight', name: 'Midnight', description: 'Focused navy workspace', swatches: ['#07111e', '#101a29', '#4cd7f6'] },
    { id: 'graphite', name: 'Graphite', description: 'Neutral operations theme', swatches: ['#111413', '#222a26', '#69e6a6'] },
    { id: 'ocean', name: 'Ocean', description: 'Deep teal quality lab', swatches: ['#06171b', '#12343c', '#5ce1d4'] },
    { id: 'light', name: 'Daylight', description: 'High-clarity light mode', swatches: ['#f3f6f8', '#ffffff', '#087f9c'] }
  ];

  constructor(private api: ApiService, private route: ActivatedRoute, public theme: ThemeService) {}

  async ngOnInit() {
    this.route.data.subscribe(data => this.section = data['section'] || 'workspace');
    await this.load();
  }

  async load() {
    this.loading = true;
    try {
      const [settings, members, health]: any[] = await Promise.all([
        this.api.getSettings(), this.api.getMembers(), this.api.getHealth()
      ]);
      this.form = { ...this.form, ...settings, email: settings.email };
      this.members = members.members || [];
      this.memberUsage = members.usage || this.memberUsage;
      this.health = health || this.health;
      this.theme.apply(this.form.theme as AppTheme);
    } catch (err: any) {
      this.error = this.errorText(err, 'Unable to load workspace settings.');
    } finally {
      this.loading = false;
    }
  }

  async saveSettings(text = 'Settings saved.') {
    this.saving = true;
    this.clearStatus();
    try {
      await this.api.updateSettings(this.form);
      this.message = text;
    } catch (err: any) {
      this.error = this.errorText(err, 'Unable to save settings.');
    } finally {
      this.saving = false;
    }
  }

  async selectTheme(theme: AppTheme) {
    this.form.theme = theme;
    this.theme.apply(theme);
    await this.saveSettings(`${this.themeName(theme)} theme applied.`);
  }

  async inviteMember() {
    this.clearStatus();
    if (!this.invite.email) return this.error = 'Enter the member email address.';
    try {
      const response: any = await this.api.inviteMember(this.invite);
      this.members = [response.member, ...this.members.filter(member => member._id !== response.member._id)];
      this.memberUsage = response.usage;
      this.message = response.emailSent
        ? `Invitation sent to ${response.member.email}.`
        : '';
      this.error = response.emailSent
        ? ''
        : `Invitation created, but email delivery failed: ${response.emailError || 'Check the Resend configuration.'}`;
      this.invite = { name: '', email: '', role: 'reviewer' };
    } catch (err: any) {
      this.error = this.errorText(err, 'Unable to invite member.');
    }
  }

  async changeRole(member: any) {
    this.clearStatus();
    try {
      await this.api.updateMember(member._id, member.role);
      this.message = `${member.email} is now a ${member.role}.`;
    } catch (err: any) {
      this.error = this.errorText(err, 'Unable to change member role.');
    }
  }

  async resend(member: any) {
    this.clearStatus();
    try {
      const response: any = await this.api.resendMemberInvite(member._id);
      this.message = response.emailSent ? `Invitation resent to ${member.email}.` : '';
      this.error = response.emailSent
        ? ''
        : `Invitation refreshed, but email delivery failed: ${response.emailError || 'Check the Resend configuration.'}`;
    } catch (err: any) {
      this.error = this.errorText(err, 'Unable to resend invitation.');
    }
  }

  async remove(member: any) {
    this.clearStatus();
    try {
      const response: any = await this.api.removeMember(member._id);
      this.members = this.members.filter(item => item._id !== member._id);
      this.memberUsage = response.usage;
      this.message = `${member.email} was removed from the workspace.`;
    } catch (err: any) {
      this.error = this.errorText(err, 'Unable to remove member.');
    }
  }

  themeName(id: string) {
    return this.themes.find(theme => theme.id === id)?.name || id;
  }

  clearStatus() {
    this.error = '';
    this.message = '';
  }

  private errorText(err: any, fallback: string) {
    return err?.error?.error || err?.message || fallback;
  }
}
