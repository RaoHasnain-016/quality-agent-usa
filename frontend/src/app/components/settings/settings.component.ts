import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  form: any = {
    company: '',
    alertEmail: '',
    alertThreshold: 70,
    companyPolicy: ''
  };
  message = '';
  error = '';

  constructor(private api: ApiService) {}

  async ngOnInit() {
    try {
      const user: any = await this.api.getCurrentUser();
      this.form.company = user.company || '';
      this.form.alertEmail = user.alertEmail || '';
      this.form.alertThreshold = user.alertThreshold ?? 70;
      this.form.companyPolicy = user.companyPolicy || '';
    } catch (err: any) {
      this.error = err?.message || 'Unable to load profile settings.';
    }
  }

  async saveSettings() {
    this.error = '';
    this.message = '';
    try {
      await this.api.updateSettings(this.form);
      this.message = 'Settings updated successfully.';
    } catch (err: any) {
      this.error = err?.error?.error || err?.message || 'Failed to save settings.';
    }
  }
}
