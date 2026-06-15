import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-workspace-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './workspace-sidebar.component.html',
  styleUrls: ['./workspace-sidebar.component.css']
})
export class WorkspaceSidebarComponent implements OnInit {
  user: any = null;
  subscription: any = null;

  constructor(private api: ApiService, private auth: AuthService, private router: Router) {}

  async ngOnInit() {
    try {
      [this.user, this.subscription] = await Promise.all([this.api.getCurrentUser(), this.api.getSubscription()]);
    } catch {
      // Navigation remains available if workspace metadata is temporarily unavailable.
    }
  }

  get initials() {
    return (this.user?.company || this.user?.email || 'AQ').split(/[\s@._-]+/).slice(0, 2).map((part: string) => part[0]).join('').toUpperCase();
  }

  get planName() {
    return this.subscription?.plan?.name || this.user?.plan || 'Free';
  }

  async logout() {
    try {
      await this.auth.signOut();
    } finally {
      await this.router.navigate(['/login']);
    }
  }
}
