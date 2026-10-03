import { HouseholdRole, HouseholdMember, PendingApplianceRequest, HouseholdProfile, UserAppliance } from '../types';
import { devLog } from './devLogger';

const ROLE_STORAGE_PREFIX = 'powerforecast_household_role_';
const LINKED_OWNER_PREFIX = 'powerforecast_household_linked_owner_';
const PROFILE_STORAGE_PREFIX = 'powerforecast_household_profile_';
const CODE_LOOKUP_PREFIX = 'powerforecast_household_code_';
const PENDING_APPLIANCES_PREFIX = 'powerforecast_pending_appliances_';

export interface UserBasicInfo {
  id: string;
  name: string;
  email: string;
}

/**
 * Returns the currently active role for this user ('owner' | 'member'). Defaults to 'owner'.
 */
export function getUserHouseholdRole(userId: string): HouseholdRole {
  if (!userId) return 'owner';
  const savedRole = localStorage.getItem(`${ROLE_STORAGE_PREFIX}${userId}`);
  return (savedRole as HouseholdRole) || 'owner';
}

/**
 * Returns linked household owner information if user is a family member.
 */
export function getLinkedHouseholdOwner(userId: string): { owner_id: string; owner_name: string; owner_email: string; invite_code: string } | null {
  if (!userId) return null;
  const raw = localStorage.getItem(`${LINKED_OWNER_PREFIX}${userId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Returns the effective household owner ID (the user ID whose data is shared).
 */
export function getEffectiveHouseholdOwnerId(user?: UserBasicInfo | null): string {
  if (!user?.id) return 'default';
  const role = getUserHouseholdRole(user.id);
  if (role === 'member') {
    const linked = getLinkedHouseholdOwner(user.id);
    if (linked?.owner_id) {
      return linked.owner_id;
    }
  }
  return user.id;
}

/**
 * Retrieves the Household Profile for a given owner.
 */
export function getHouseholdProfile(ownerUser: UserBasicInfo): HouseholdProfile {
  const key = `${PROFILE_STORAGE_PREFIX}${ownerUser.id}`;
  const raw = localStorage.getItem(key);
  if (raw) {
    try {
      const parsed: HouseholdProfile = JSON.parse(raw);
      // Ensure current user is properly synced as primary owner with up-to-date name/email
      if (parsed.members && parsed.members.length > 0) {
        const ownerIndex = parsed.members.findIndex((m) => m.role === 'owner');
        if (ownerIndex !== -1) {
          parsed.members[ownerIndex].name = ownerUser.name;
          parsed.members[ownerIndex].email = ownerUser.email;
        }
      }
      return parsed;
    } catch (e) {
      devLog.warn('Household', 'Failed to parse household profile:', e);
    }
  }

  // Create initial profile
  const initialProfile: HouseholdProfile = {
    household_id: `hh-${ownerUser.id}`,
    owner_id: ownerUser.id,
    owner_name: ownerUser.name,
    owner_email: ownerUser.email,
    invite_code: '',
    created_at: new Date().toISOString(),
    members: [
      {
        id: `owner-${ownerUser.id}`,
        name: ownerUser.name,
        email: ownerUser.email,
        role: 'owner',
        status: 'active',
        joinedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      },
    ],
  };

  saveHouseholdProfile(initialProfile);
  return initialProfile;
}

export function saveHouseholdProfile(profile: HouseholdProfile): void {
  try {
    localStorage.setItem(`${PROFILE_STORAGE_PREFIX}${profile.owner_id}`, JSON.stringify(profile));
    // Also dispatch sync event for real-time reactivity
    window.dispatchEvent(new CustomEvent('powerforecast_household_sync', { detail: { owner_id: profile.owner_id } }));
  } catch (err) {
    devLog.error('Household', 'Could not save household profile:', err);
  }
}

/**
 * Creates or retrieves the active invite code for this owner, ensuring they are set to Household Owner.
 */
export function createOrGetInviteCode(ownerUser: UserBasicInfo): { inviteCode: string; inviteLink: string } {
  // Promote to owner
  localStorage.setItem(`${ROLE_STORAGE_PREFIX}${ownerUser.id}`, 'owner');
  localStorage.removeItem(`${LINKED_OWNER_PREFIX}${ownerUser.id}`);

  const profile = getHouseholdProfile(ownerUser);
  let code = profile.invite_code;

  if (!code) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    code = `PF-HH-${randomSuffix}`;
    profile.invite_code = code;
    saveHouseholdProfile(profile);
  }

  // Register in global lookup table
  const lookupEntry = {
    owner_id: ownerUser.id,
    owner_name: ownerUser.name,
    owner_email: ownerUser.email,
    invite_code: code,
  };
  localStorage.setItem(`${CODE_LOOKUP_PREFIX}${code.toUpperCase()}`, JSON.stringify(lookupEntry));

  const link = `${window.location.origin}/#/signup?invite=${code}&owner=${encodeURIComponent(ownerUser.email)}`;
  return { inviteCode: code, inviteLink: link };
}

/**
 * Joins a household using an invite code. Sets current user to 'member' role.
 */
export function joinHouseholdWithCode(
  rawCode: string,
  currentUser: UserBasicInfo
): { success: boolean; message: string; ownerName?: string; ownerEmail?: string } {
  const code = (rawCode || '').trim().toUpperCase();
  if (!code) {
    return { success: false, message: 'Please enter a valid invite code.' };
  }

  // Check code lookup table
  const lookupRaw = localStorage.getItem(`${CODE_LOOKUP_PREFIX}${code}`);
  if (!lookupRaw) {
    return {
      success: false,
      message: `Invite code "${code}" was not found or has expired. Please verify with your Household Owner.`,
    };
  }

  let lookup: { owner_id: string; owner_name: string; owner_email: string; invite_code: string };
  try {
    lookup = JSON.parse(lookupRaw);
  } catch {
    return { success: false, message: 'Invalid code data format.' };
  }

  if (lookup.owner_id === currentUser.id) {
    return { success: false, message: 'You cannot join your own household with your own invite code.' };
  }

  // Set user role to 'member'
  localStorage.setItem(`${ROLE_STORAGE_PREFIX}${currentUser.id}`, 'member');
  localStorage.setItem(`${LINKED_OWNER_PREFIX}${currentUser.id}`, JSON.stringify(lookup));

  // Add this user to the Household Owner's members list
  const ownerProfileKey = `${PROFILE_STORAGE_PREFIX}${lookup.owner_id}`;
  const ownerProfileRaw = localStorage.getItem(ownerProfileKey);
  if (ownerProfileRaw) {
    try {
      const ownerProfile: HouseholdProfile = JSON.parse(ownerProfileRaw);
      const existingIdx = ownerProfile.members.findIndex(
        (m) => m.id === currentUser.id || m.email.toLowerCase() === currentUser.email.toLowerCase()
      );

      const memberObj: HouseholdMember = {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        role: 'member',
        status: 'active',
        joinedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        inviteCode: code,
      };

      if (existingIdx !== -1) {
        ownerProfile.members[existingIdx] = memberObj;
      } else {
        ownerProfile.members.push(memberObj);
      }
      saveHouseholdProfile(ownerProfile);
    } catch (err) {
      devLog.error('Household', 'Could not update owner profile with new member:', err);
    }
  }

  window.dispatchEvent(new CustomEvent('powerforecast_household_role_changed', { detail: { role: 'member', owner_id: lookup.owner_id } }));

  return {
    success: true,
    message: `Successfully joined ${lookup.owner_name}'s household!`,
    ownerName: lookup.owner_name,
    ownerEmail: lookup.owner_email,
  };
}

/**
 * Leaves the current household and restores user to independent Household Owner.
 */
export function leaveHousehold(currentUser: UserBasicInfo): void {
  const linked = getLinkedHouseholdOwner(currentUser.id);
  if (linked?.owner_id) {
    // Remove from owner profile
    const ownerProfileKey = `${PROFILE_STORAGE_PREFIX}${linked.owner_id}`;
    const ownerProfileRaw = localStorage.getItem(ownerProfileKey);
    if (ownerProfileRaw) {
      try {
        const ownerProfile: HouseholdProfile = JSON.parse(ownerProfileRaw);
        ownerProfile.members = ownerProfile.members.filter(
          (m) => m.id !== currentUser.id && m.email.toLowerCase() !== currentUser.email.toLowerCase()
        );
        saveHouseholdProfile(ownerProfile);
      } catch {}
    }
  }

  localStorage.setItem(`${ROLE_STORAGE_PREFIX}${currentUser.id}`, 'owner');
  localStorage.removeItem(`${LINKED_OWNER_PREFIX}${currentUser.id}`);

  window.dispatchEvent(new CustomEvent('powerforecast_household_role_changed', { detail: { role: 'owner', owner_id: currentUser.id } }));
}

/**
 * Retrieves pending appliance approval requests for a household owner.
 */
export function getPendingApplianceRequests(ownerId: string): PendingApplianceRequest[] {
  const key = `${PENDING_APPLIANCES_PREFIX}${ownerId}`;
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function savePendingApplianceRequests(ownerId: string, requests: PendingApplianceRequest[]): void {
  try {
    localStorage.setItem(`${PENDING_APPLIANCES_PREFIX}${ownerId}`, JSON.stringify(requests));
    window.dispatchEvent(new CustomEvent('powerforecast_pending_appliances_updated', { detail: { owner_id: ownerId } }));
  } catch (err) {
    devLog.error('Household', 'Failed to save pending appliance requests:', err);
  }
}

/**
 * Submits an appliance for approval by the Household Owner.
 */
export function submitApplianceRequest(
  ownerId: string,
  memberUser: UserBasicInfo,
  applianceData: Partial<UserAppliance>
): PendingApplianceRequest {
  const requests = getPendingApplianceRequests(ownerId);
  const newRequest: PendingApplianceRequest = {
    id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    household_id: ownerId,
    requested_by_id: memberUser.id,
    requested_by_name: memberUser.name,
    requested_by_email: memberUser.email,
    requested_at: new Date().toISOString(),
    status: 'pending',
    appliance_data: {
      ...applianceData,
      is_active: false,
      approval_status: 'pending',
      requested_by: memberUser.name,
      requested_by_email: memberUser.email,
    },
  };

  requests.unshift(newRequest);
  savePendingApplianceRequests(ownerId, requests);
  return newRequest;
}

/**
 * Approves an appliance request and activates it into the household inventory.
 */
export function approveApplianceRequest(
  ownerId: string,
  requestId: string
): { success: boolean; approvedAppliance?: Partial<UserAppliance> } {
  const requests = getPendingApplianceRequests(ownerId);
  const target = requests.find((r) => r.id === requestId);
  if (!target) return { success: false };

  target.status = 'approved';
  savePendingApplianceRequests(ownerId, requests);

  // Activate appliance in household storage / data provider
  const applianceData = {
    ...target.appliance_data,
    is_active: true,
    approval_status: 'approved' as const,
  };

  // Add into local storage user_appliances
  try {
    const raw = localStorage.getItem('powerforecast_user_appliances');
    const list: any[] = raw ? JSON.parse(raw) : [];
    const newAppliance = {
      id: `app-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_id: ownerId,
      ...applianceData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    list.unshift(newAppliance);
    localStorage.setItem('powerforecast_user_appliances', JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('powerforecast_appliances_updated'));
  } catch (err) {
    devLog.warn('Household', 'Could not insert approved appliance locally:', err);
  }

  return { success: true, approvedAppliance: applianceData };
}

/**
 * Rejects an appliance request.
 */
export function rejectApplianceRequest(ownerId: string, requestId: string): boolean {
  const requests = getPendingApplianceRequests(ownerId);
  const target = requests.find((r) => r.id === requestId);
  if (!target) return false;

  target.status = 'rejected';
  savePendingApplianceRequests(ownerId, requests);
  return true;
}

/**
 * Purges legacy corrupted 'powerforecast_household_default' that held hardcoded tester email.
 */
export function purgeLegacyTesterAccountData(): void {
  try {
    const legacyDefault = localStorage.getItem('powerforecast_household_default');
    if (legacyDefault && (legacyDefault.includes('test09@gmail.com') || legacyDefault.includes('Demo User'))) {
      localStorage.removeItem('powerforecast_household_default');
    }
  } catch {}
}
