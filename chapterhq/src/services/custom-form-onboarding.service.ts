import { CustomFormSubmissionService } from "./custom-form-submission.service";

/**
 * Service to manage custom form onboarding integration.
 * This service determines whether a new member needs to complete required forms
 * before getting full access to the organization.
 */
export class CustomFormOnboardingService {
  private readonly submissionService = new CustomFormSubmissionService();

  /**
   * Check if a member has completed all required onboarding forms.
   * Returns true if the member is fully onboarded, false if they still have incomplete required forms.
   */
  async isMemberFullyOnboarded(organizationId: string, memberId: string): Promise<boolean> {
    try {
      return await this.submissionService.isOnboardingComplete(organizationId, memberId);
    } catch (error) {
      // If there's an error checking, allow access (fail open)
      console.error("Error checking onboarding status:", error);
      return true;
    }
  }

  /**
   * Get pending onboarding forms for a member.
   * Returns forms that the member still needs to complete.
   */
  async getPendingForms(organizationId: string, memberId: string) {
    try {
      const result = await this.submissionService.getMemberRequiredForms(organizationId, memberId);
      return result.incompleteRequired;
    } catch (error) {
      console.error("Error getting pending forms:", error);
      return [];
    }
  }

  /**
   * Get all onboarding information for a member.
   * Returns required forms, completed forms, and incomplete forms.
   */
  async getMemberOnboardingStatus(organizationId: string, memberId: string) {
    return this.submissionService.getMemberRequiredForms(organizationId, memberId);
  }
}
