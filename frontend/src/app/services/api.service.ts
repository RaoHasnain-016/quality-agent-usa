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

  async getBatches(page = 1, limit = 10, status = '') {
    const statusQuery = status ? `&status=${encodeURIComponent(status)}` : '';
    return this.http
      .get(`${this.baseUrl}/api/batches?page=${page}&limit=${limit}${statusQuery}`, { headers: await this.headers() })
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
      .patch(`${this.baseUrl}/api/conversations/detail/${id}/review`, {}, { headers: await this.headers() })
      .toPromise();
  }

  async overrideConversation(id: string, overrideScore: number, note: string) {
    return this.http
      .patch(
        `${this.baseUrl}/api/conversations/detail/${id}/override`,
        { overrideScore, note },
        { headers: await this.headers() }
      )
      .toPromise();
  }

  async listConversations(params: Record<string, string | number> = {}) {
    const query = new URLSearchParams(Object.entries(params).map(([key, value]) => [key, String(value)])).toString();
    return this.http
      .get(`${this.baseUrl}/api/conversations${query ? `?${query}` : ''}`, { headers: await this.headers() })
      .toPromise();
  }

  async getConversationSummary() {
    return this.http.get(`${this.baseUrl}/api/conversations/summary`, { headers: await this.headers() }).toPromise();
  }

  async bulkReviewConversations(ids: string[]) {
    return this.http.patch(`${this.baseUrl}/api/conversations/bulk-review`, { ids }, { headers: await this.headers() }).toPromise();
  }

  async getAnalysisOverview() {
    return this.http.get(`${this.baseUrl}/api/analysis/overview`, { headers: await this.headers() }).toPromise();
  }

  async getAnalysisTrends(days = 30) {
    return this.http.get(`${this.baseUrl}/api/analysis/trends?days=${days}`, { headers: await this.headers() }).toPromise();
  }

  async getAnalysisDistribution() {
    return this.http.get(`${this.baseUrl}/api/analysis/distribution`, { headers: await this.headers() }).toPromise();
  }

  async getAnalysisFailures() {
    return this.http.get(`${this.baseUrl}/api/analysis/failures`, { headers: await this.headers() }).toPromise();
  }

  async getAnalysisBatches() {
    return this.http.get(`${this.baseUrl}/api/analysis/batches`, { headers: await this.headers() }).toPromise();
  }

  async getAnalysisActivity() {
    return this.http.get(`${this.baseUrl}/api/analysis/activity`, { headers: await this.headers() }).toPromise();
  }

  async getAlerts(params: Record<string, string | number> = {}) {
    const query = new URLSearchParams(Object.entries(params).map(([key, value]) => [key, String(value)])).toString();
    return this.http.get(`${this.baseUrl}/api/alerts${query ? `?${query}` : ''}`, { headers: await this.headers() }).toPromise();
  }

  async getAlertSummary() {
    return this.http.get(`${this.baseUrl}/api/alerts/summary`, { headers: await this.headers() }).toPromise();
  }

  async updateAlert(id: string, status: 'acknowledged' | 'resolved', note = '') {
    return this.http.patch(`${this.baseUrl}/api/alerts/${id}`, { status, note }, { headers: await this.headers() }).toPromise();
  }

  async getResearchStudies(status = '') {
    return this.http.get(`${this.baseUrl}/api/research${status ? `?status=${encodeURIComponent(status)}` : ''}`, { headers: await this.headers() }).toPromise();
  }

  async getResearchSummary() {
    return this.http.get(`${this.baseUrl}/api/research/summary`, { headers: await this.headers() }).toPromise();
  }

  async getResearchStudy(id: string) {
    return this.http.get(`${this.baseUrl}/api/research/${id}`, { headers: await this.headers() }).toPromise();
  }

  async createResearchStudy(payload: { title: string; objective: string; sourceBatchIds?: string[] }) {
    return this.http.post(`${this.baseUrl}/api/research`, payload, { headers: await this.headers() }).toPromise();
  }

  async runResearchStudy(id: string) {
    return this.http.post(`${this.baseUrl}/api/research/${id}/run`, {}, { headers: await this.headers() }).toPromise();
  }

  async updateResearchStudy(id: string, payload: any) {
    return this.http.patch(`${this.baseUrl}/api/research/${id}`, payload, { headers: await this.headers() }).toPromise();
  }

  async deleteResearchStudy(id: string) {
    return this.http.delete(`${this.baseUrl}/api/research/${id}`, { headers: await this.headers() }).toPromise();
  }

  async getExecutiveReport() {
    return this.http.get(`${this.baseUrl}/api/reports/executive`, { headers: await this.headers() }).toPromise();
  }

  async getReports(status = '', type = '') {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (type) params.set('type', type);
    return this.http.get(`${this.baseUrl}/api/reports${params.toString() ? `?${params}` : ''}`, { headers: await this.headers() }).toPromise();
  }

  async getReportSummary() {
    return this.http.get(`${this.baseUrl}/api/reports/summary`, { headers: await this.headers() }).toPromise();
  }

  async getReport(id: string) {
    return this.http.get(`${this.baseUrl}/api/reports/${id}`, { headers: await this.headers() }).toPromise();
  }

  async createReport(payload: any) {
    return this.http.post(`${this.baseUrl}/api/reports`, payload, { headers: await this.headers() }).toPromise();
  }

  async scheduleReport(id: string, schedule: string, recipients: string[]) {
    return this.http.patch(`${this.baseUrl}/api/reports/${id}/schedule`, { schedule, recipients }, { headers: await this.headers() }).toPromise();
  }

  async deleteReport(id: string) {
    return this.http.delete(`${this.baseUrl}/api/reports/${id}`, { headers: await this.headers() }).toPromise();
  }

  async getSettings() {
    return this.http.get(`${this.baseUrl}/api/settings`, { headers: await this.headers() }).toPromise();
  }

  async getHealth() {
    return this.http.get(`${this.baseUrl}/health`).toPromise();
  }

  async getMembers() {
    return this.http.get(`${this.baseUrl}/api/members`, { headers: await this.headers() }).toPromise();
  }

  async inviteMember(payload: { name?: string; email: string; role: string }) {
    return this.http.post(`${this.baseUrl}/api/members/invite`, payload, { headers: await this.headers() }).toPromise();
  }

  async updateMember(id: string, role: string) {
    return this.http.patch(`${this.baseUrl}/api/members/${id}`, { role }, { headers: await this.headers() }).toPromise();
  }

  async resendMemberInvite(id: string) {
    return this.http.post(`${this.baseUrl}/api/members/${id}/resend`, {}, { headers: await this.headers() }).toPromise();
  }

  async removeMember(id: string) {
    return this.http.delete(`${this.baseUrl}/api/members/${id}`, { headers: await this.headers() }).toPromise();
  }

  async acceptMemberInvite(token: string) {
    return this.http.post(`${this.baseUrl}/api/members/accept`, { token }, { headers: await this.headers() }).toPromise();
  }

  async getPlans() {
    return this.http.get(`${this.baseUrl}/api/billing/plans`).toPromise();
  }

  async getSubscription() {
    return this.http.get(`${this.baseUrl}/api/billing/subscription`, { headers: await this.headers() }).toPromise();
  }

  async createCheckout(plan: string) {
    return this.http.post(`${this.baseUrl}/api/billing/checkout`, { plan }, { headers: await this.headers() }).toPromise();
  }

  async confirmCheckout(sessionId: string) {
    return this.http.post(`${this.baseUrl}/api/billing/checkout/confirm`, { sessionId }, { headers: await this.headers() }).toPromise();
  }

  async createBillingPortal() {
    return this.http.post(`${this.baseUrl}/api/billing/portal`, {}, { headers: await this.headers() }).toPromise();
  }

  async getInvoices() {
    return this.http.get(`${this.baseUrl}/api/billing/invoices`, { headers: await this.headers() }).toPromise();
  }

  async getWorkspaceUsage() {
    return this.http.get(`${this.baseUrl}/api/workspace/usage`, { headers: await this.headers() }).toPromise();
  }

  async getAuditLogs(category = '') {
    return this.http.get(`${this.baseUrl}/api/workspace/audit${category ? `?category=${encodeURIComponent(category)}` : ''}`, { headers: await this.headers() }).toPromise();
  }

  async getSupportCenter() {
    return this.http.get(`${this.baseUrl}/api/workspace/support`, { headers: await this.headers() }).toPromise();
  }

  async createSupportTicket(payload: any) {
    return this.http.post(`${this.baseUrl}/api/workspace/support/tickets`, payload, { headers: await this.headers() }).toPromise();
  }

  async exportBatch(id: string) {
    return this.http.get(`${this.baseUrl}/api/batches/${id}/export`, {
      headers: await this.headers(),
      responseType: 'blob'
    }).toPromise();
  }

  async evaluateTranscript(transcript: string, companyPolicy = '') {
    return this.http.post(
      `${this.baseUrl}/api/ai/evaluate`,
      { transcript, companyPolicy },
      { headers: await this.headers() }
    ).toPromise();
  }

  async updateSettings(payload: any) {
    return this.http
      .put(`${this.baseUrl}/api/settings`, payload, { headers: await this.headers() })
      .toPromise();
  }
}
