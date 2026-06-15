import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email = 'admin@agentqa.local';
  password = 'AgentQA123!';
  error = '';
  loading = false;

  constructor(private router: Router, private auth: AuthService) {}

  async signIn() {
    this.loading = true;
    this.error = '';
    try {
      await this.auth.signIn(this.email, this.password);
      await this.router.navigate(['/dashboard']);
    } catch (error: any) {
      this.error = error?.error?.error || error?.message || 'Unable to sign in.';
    } finally {
      this.loading = false;
    }
  }

  async signInWithGoogle() {
    try {
      await this.auth.signInWithGoogle();
    } catch (error: any) {
      this.error = error?.message || 'Google login is not configured.';
    }
  }
}
