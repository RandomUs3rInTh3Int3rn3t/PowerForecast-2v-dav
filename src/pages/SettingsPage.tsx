import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SettingsView } from "../components/settings/SettingsView";
import { useHousehold } from "../context/HouseholdContext";
import { useToast } from "../components/common/ToastProvider";

export const SettingsPage: React.FC = () => {
  const { isFamilyMember } = useHousehold();
  const { showInfo } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (isFamilyMember) {
      showInfo("Settings are restricted to Household Owners. Ask your owner to make changes.");
      navigate("/dashboard", { replace: true });
    }
  }, [isFamilyMember, navigate, showInfo]);

  if (isFamilyMember) return null;

  return <SettingsView />;
};

export default SettingsPage;
