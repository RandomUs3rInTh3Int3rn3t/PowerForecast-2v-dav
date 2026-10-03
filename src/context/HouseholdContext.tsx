import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useGetIdentity } from '@refinedev/core';
import {
  HouseholdRole,
  HouseholdMember,
  PendingApplianceRequest,
  UserAppliance,
} from '../types';
import {
  getUserHouseholdRole,
  getLinkedHouseholdOwner,
  getEffectiveHouseholdOwnerId,
  getHouseholdProfile,
  saveHouseholdProfile,
  createOrGetInviteCode,
  joinHouseholdWithCode,
  leaveHousehold as svcLeaveHousehold,
  getPendingApplianceRequests,
  submitApplianceRequest,
  approveApplianceRequest,
  rejectApplianceRequest,
  purgeLegacyTesterAccountData,
  UserBasicInfo,
} from '../lib/householdService';

interface HouseholdContextType {
  role: HouseholdRole;
  isOwner: boolean;
  isFamilyMember: boolean;
  canAccessSettings: boolean;
  needsApplianceApproval: boolean;
  activeHouseholdId: string;
  ownerInfo: { owner_id: string; owner_name: string; owner_email: string; invite_code: string } | null;
  inviteCode: string;
  inviteLink: string;
  members: HouseholdMember[];
  pendingRequests: PendingApplianceRequest[];
  createInvite: () => Promise<{ inviteCode: string; inviteLink: string }>;
  joinWithCode: (code: string) => Promise<{ success: boolean; message: string }>;
  leaveHousehold: () => void;
  submitAppliance: (appliance: Partial<UserAppliance>) => Promise<PendingApplianceRequest>;
  approveAppliance: (requestId: string) => Promise<boolean>;
  rejectAppliance: (requestId: string) => Promise<boolean>;
  removeMember: (memberId: string) => void;
  addMember: (member: HouseholdMember) => void;
  isHouseholdModalOpen: boolean;
  householdModalTab: number;
  openHouseholdModal: (tab?: number) => void;
  closeHouseholdModal: () => void;
}

const HouseholdContext = createContext<HouseholdContextType | undefined>(undefined);

export const HouseholdProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: identity } = useGetIdentity<any>();

  // Synchronously read cached active user as immediate fallback
  const getResolvedUser = useCallback((): UserBasicInfo => {
    let cachedUser: any = null;
    try {
      const raw = localStorage.getItem('powerforecast_active_user');
      if (raw) cachedUser = JSON.parse(raw);
    } catch {}

    const id = identity?.id || cachedUser?.id || 'default-user';
    const email = identity?.email || cachedUser?.email || '';
    const name = identity?.name || cachedUser?.name || email.split('@')[0] || 'User';

    return { id, email, name };
  }, [identity]);

  const currentUser = getResolvedUser();

  const [role, setRole] = useState<HouseholdRole>(() => getUserHouseholdRole(currentUser.id));
  const [ownerInfo, setOwnerInfo] = useState(() => getLinkedHouseholdOwner(currentUser.id));
  const [activeHouseholdId, setActiveHouseholdId] = useState(() => getEffectiveHouseholdOwnerId(currentUser));
  const [inviteCode, setInviteCode] = useState<string>('');
  const [inviteLink, setInviteLink] = useState<string>('');
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingApplianceRequest[]>([]);
  const [isHouseholdModalOpen, setIsHouseholdModalOpen] = useState(false);
  const [householdModalTab, setHouseholdModalTab] = useState(0);

  // Clean legacy tester accounts once on mount
  useEffect(() => {
    purgeLegacyTesterAccountData();
  }, []);

  // Sync state when user identity or role changes
  const refreshHouseholdState = useCallback(() => {
    const user = getResolvedUser();
    const currentRole = getUserHouseholdRole(user.id);
    setRole(currentRole);

    const linked = getLinkedHouseholdOwner(user.id);
    setOwnerInfo(linked);

    const effectiveId = getEffectiveHouseholdOwnerId(user);
    setActiveHouseholdId(effectiveId);

    if (currentRole === 'owner') {
      const profile = getHouseholdProfile(user);
      setInviteCode(profile.invite_code || '');
      if (profile.invite_code) {
        setInviteLink(`${window.location.origin}/#/signup?invite=${profile.invite_code}&owner=${encodeURIComponent(user.email)}`);
      } else {
        setInviteLink('');
      }
      setMembers(profile.members || []);
      setPendingRequests(getPendingApplianceRequests(user.id));
    } else if (linked?.owner_id) {
      // For family member, read from linked owner profile
      const ownerUser: UserBasicInfo = {
        id: linked.owner_id,
        name: linked.owner_name,
        email: linked.owner_email,
      };
      const ownerProfile = getHouseholdProfile(ownerUser);
      setInviteCode(linked.invite_code || ownerProfile.invite_code);
      setMembers(ownerProfile.members || []);
      setPendingRequests(getPendingApplianceRequests(linked.owner_id));
    }
  }, [getResolvedUser]);

  useEffect(() => {
    refreshHouseholdState();
  }, [refreshHouseholdState, identity]);

  // Listen to custom window sync events
  useEffect(() => {
    const handleSync = () => refreshHouseholdState();
    window.addEventListener('powerforecast_household_sync', handleSync);
    window.addEventListener('powerforecast_household_role_changed', handleSync);
    window.addEventListener('powerforecast_pending_appliances_updated', handleSync);

    return () => {
      window.removeEventListener('powerforecast_household_sync', handleSync);
      window.removeEventListener('powerforecast_household_role_changed', handleSync);
      window.removeEventListener('powerforecast_pending_appliances_updated', handleSync);
    };
  }, [refreshHouseholdState]);

  const handleCreateInvite = async (): Promise<{ inviteCode: string; inviteLink: string }> => {
    const user = getResolvedUser();
    const result = createOrGetInviteCode(user);
    setRole('owner');
    setInviteCode(result.inviteCode);
    setInviteLink(result.inviteLink);
    refreshHouseholdState();
    return result;
  };

  const handleJoinWithCode = async (code: string): Promise<{ success: boolean; message: string }> => {
    const user = getResolvedUser();
    const result = joinHouseholdWithCode(code, user);
    if (result.success) {
      refreshHouseholdState();
    }
    return result;
  };

  const handleLeaveHousehold = () => {
    const user = getResolvedUser();
    svcLeaveHousehold(user);
    refreshHouseholdState();
  };

  const handleSubmitAppliance = async (appliance: Partial<UserAppliance>): Promise<PendingApplianceRequest> => {
    const user = getResolvedUser();
    const effectiveOwnerId = getEffectiveHouseholdOwnerId(user);
    const req = submitApplianceRequest(effectiveOwnerId, user, appliance);
    setPendingRequests(getPendingApplianceRequests(effectiveOwnerId));
    return req;
  };

  const handleApproveAppliance = async (requestId: string): Promise<boolean> => {
    const user = getResolvedUser();
    const res = approveApplianceRequest(user.id, requestId);
    setPendingRequests(getPendingApplianceRequests(user.id));
    return res.success;
  };

  const handleRejectAppliance = async (requestId: string): Promise<boolean> => {
    const user = getResolvedUser();
    const ok = rejectApplianceRequest(user.id, requestId);
    setPendingRequests(getPendingApplianceRequests(user.id));
    return ok;
  };

  const handleRemoveMember = (memberId: string) => {
    const user = getResolvedUser();
    const profile = getHouseholdProfile(user);
    profile.members = profile.members.filter((m) => m.id !== memberId);
    saveHouseholdProfile(profile);
    setMembers(profile.members);
  };

  const handleAddMember = (newMember: HouseholdMember) => {
    const user = getResolvedUser();
    const profile = getHouseholdProfile(user);
    const existingIndex = profile.members.findIndex((m) => m.id === newMember.id || m.email === newMember.email);
    if (existingIndex !== -1) {
      profile.members[existingIndex] = newMember;
    } else {
      profile.members.push(newMember);
    }
    saveHouseholdProfile(profile);
    setMembers(profile.members);
  };

  const openHouseholdModal = (tab: number = 0) => {
    setHouseholdModalTab(tab);
    setIsHouseholdModalOpen(true);
  };

  const closeHouseholdModal = () => {
    setIsHouseholdModalOpen(false);
  };

  const isOwner = role === 'owner';
  const isFamilyMember = role === 'member';
  const canAccessSettings = isOwner;
  const needsApplianceApproval = isFamilyMember;

  return (
    <HouseholdContext.Provider
      value={{
        role,
        isOwner,
        isFamilyMember,
        canAccessSettings,
        needsApplianceApproval,
        activeHouseholdId,
        ownerInfo,
        inviteCode,
        inviteLink,
        members,
        pendingRequests,
        createInvite: handleCreateInvite,
        joinWithCode: handleJoinWithCode,
        leaveHousehold: handleLeaveHousehold,
        submitAppliance: handleSubmitAppliance,
        approveAppliance: handleApproveAppliance,
        rejectAppliance: handleRejectAppliance,
        removeMember: handleRemoveMember,
        addMember: handleAddMember,
        isHouseholdModalOpen,
        householdModalTab,
        openHouseholdModal,
        closeHouseholdModal,
      }}
    >
      {children}
    </HouseholdContext.Provider>
  );
};

export const useHousehold = (): HouseholdContextType => {
  const context = useContext(HouseholdContext);
  if (!context) {
    throw new Error('useHousehold must be used within a HouseholdProvider');
  }
  return context;
};
