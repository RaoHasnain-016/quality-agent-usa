import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-auth-flow',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './auth-flow.component.html',
  styleUrls: ['./auth-flow.component.css']
})
export class AuthFlowComponent implements OnInit {
  title = 'Create your account';
  subtitle = 'Start monitoring your AI quality in minutes.';
  mode = 'signup';
  email = '';
  password = '';
  name = '';
  submitted = false;
  error = '';
  inviteToken = '';

  constructor(private route: ActivatedRoute, private router: Router, private auth: AuthService, private api: ApiService) {}

  ngOnInit() {
    this.mode = this.route.snapshot.data['mode'] || 'signup';
    this.inviteToken = this.route.snapshot.queryParamMap.get('token') || '';
    const copy: Record<string, [string, string]> = {
      signup: ['Create your account', 'Start monitoring your AI quality in minutes.'],
      forgot: ['Reset your password', 'We will send a secure reset link to your email.'],
      reset: ['Choose a new password', 'Use at least 8 characters with a number.'],
      verify: ['Verify your email', 'Enter the code sent to your inbox.'],
      invite: ['Join AgentQA workspace', 'Rao invited you to collaborate on quality monitoring.']
    };
    [this.title, this.subtitle] = copy[this.mode] || copy['signup'];
  }

  async continueWithGoogle() {
    try {
      await this.auth.signInWithGoogle();
      await this.completeAuthentication();
    } catch (error: any) {
      this.error = error?.message || 'Google login is not configured.';
    }
  }

  async submit() {
    this.submitted = true;
    this.error = '';
    try {
      if (this.mode === 'signup' || this.mode === 'invite') {
        await this.auth.signUp(this.email, this.password, this.name);
        await this.completeAuthentication();
      } else {
        await new Promise(resolve => setTimeout(resolve, 650));
        await this.router.navigate(['/login']);
      }
    } catch (error: any) {
      this.error = error?.error?.error || error?.message || 'Unable to continue.';
    } finally {
      this.submitted = false;
    }
  }

  private async completeAuthentication() {
    if (this.mode === 'invite' && this.inviteToken) {
      await this.api.acceptMemberInvite(this.inviteToken);
      await this.router.navigate(['/dashboard']);
      return;
    }
    await this.router.navigate(['/onboarding']);
  }
}
