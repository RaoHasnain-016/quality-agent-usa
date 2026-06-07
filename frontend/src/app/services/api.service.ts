import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient, private auth: AuthService) {}

  private async headers() {
    const token = await this.auth.getIdToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token ?? ''}`,
      'Content-Type': 'application/json'
    });
  }

  async getCurrentUser() {
    return this.http
      .get(`${this.baseUrl}/api/auth/me`, { headers: await this.headers() })
      .toPromise();
  }

  async getDashboardStats() {
    return this.http
      .get(`${this.baseUrl}/api/dashboard/stats`, { headers: await this.headers() })
      .toPromise();
  }

  async getRecentBatches() {
    return this.http
      .get(`${this.baseUrl}/api/dashboard/recent-batches`, { headers: await this.headers() })
      .toPromise();
  }

  async getBatches(page = 1, limit = 10) {
    return this.http
      .get(`${this.baseUrl}/api/batches?page=${page}&limit=${limit}`, { headers: await this.headers() })
      .toPromise();
  }

  async uploadBatch(formData: FormData) {
    const token = await this.auth.getIdToken();
    return this.http
      .post(`${this.baseUrl}/api/batches`, formData, {
        headers: new HttpHeaders({ Authorization: `Bearer ${token ?? ''}` })
      })
      .toPromise();
  }

  async getBatch(id: string) {
    return this.http
      .get(`${this.baseUrl}/api/batches/${id}`, { headers: await this.headers() })
      .toPromise();
  }

  async deleteBatch(id: string) {
    return this.http
      .delete(`${this.baseUrl}/api/batches/${id}`, { headers: await this.headers() })
      .toPromise();
  }

  async getConversations(batchId: string) {
    return this.http
      .get(`${this.baseUrl}/api/conversations/${batchId}`, { headers: await this.headers() })
      .toPromise();
  }

  async getConversationDetail(id: string) {
    return this.http
      .get(`${this.baseUrl}/api/conversations/detail/${id}`, { headers: await this.headers() })
      .toPromise();
  }

  async reviewConversation(id: string) {
    return this.http
      .patch(`${this.baseUrl}/api/conversations/${id}/review`, {}, { headers: await this.headers() })
      .toPromise();
  }

  async overrideConversation(id: string, overrideScore: number, note: string) {
    return this.http
      .patch(
        `${this.baseUrl}/api/conversations/${id}/override`,
        { overrideScore, note },
        { headers: await this.headers() }
      )
      .toPromise();
  }

  async updateSettings(payload: any) {
    return this.http
      .put(`${this.baseUrl}/api/settings`, payload, { headers: await this.headers() })
      .toPromise();
  }
}
