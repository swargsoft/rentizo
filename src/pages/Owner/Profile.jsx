import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Stack,
  TextField,
  Alert,
  CircularProgress,
} from "@mui/material";
import AppLayout from "@/components/Common/AppLayout.jsx";
import ProfileMedia, {
  CROP_PRESETS,
} from "@/components/Common/ProfileMedia.jsx";
import ImageCropDialog from "@/components/Common/ImageCropDialog.jsx";
import useAuthStore from "@/store/authStore.js";
import useUiStore from "@/store/uiStore.js";
import { useOwnerProfile } from "@/hooks/useNostrProfile.js";
import { publishOwnerProfile } from "@/nostr/publish.js";
import {
  validatePhone,
  validateUpiId,
  formatPhone,
} from "@/utils/nostrValidation.js";
import db from "@/db/index.js";
import driveApi from "@/utils/driveApi.js";

export default function OwnerProfile() {
  const { pubkey, secretKey } = useAuthStore();
  const showSnackbar = useUiStore((s) => s.showSnackbar);
  const profile = useOwnerProfile();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [upiId, setUpiId] = useState("");
  const [avatar, setAvatar] = useState(null); // base64 or blob URL
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [avatarFile, setAvatarFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);

  // Crop dialog state - separate states for avatar and banner to allow updating both in one go
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [avatarCropSrc, setAvatarCropSrc] = useState(null);
  const [bannerCropSrc, setBannerCropSrc] = useState(null);
  const [cropType, setCropType] = useState(null); // 'avatar' or 'banner'

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? "");
      setPhone(profile.phone ?? "");
      setUpiId(profile.upiId ?? "");
      // Clear local blob files when profile loads - use CDN URLs
      setAvatarFile(null);
      setBannerFile(null);
      // Restore avatar from Drive CDN URL
      if (profile.profilePicture) {
        setAvatar(driveApi.constructor.imageUrl(profile.profilePicture));
      } else {
        setAvatar(null);
      }
      // Restore banner preview from Drive CDN URL
      if (profile.bannerImage) {
        setBannerPreview(driveApi.constructor.imageUrl(profile.bannerImage));
      } else {
        setBannerPreview(null);
      }
    }
  }, [profile]);

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setAvatarCropSrc(objectUrl);
    setCropType("avatar");
    setCropDialogOpen(true);
  }

  async function handleBannerChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setBannerCropSrc(objectUrl);
    setCropType("banner");
    setCropDialogOpen(true);
  }

  function handleCropComplete(croppedBlob) {
    if (cropType === "avatar") {
      setAvatarFile(croppedBlob);
      setAvatar(URL.createObjectURL(croppedBlob));
    } else if (cropType === "banner") {
      setBannerFile(croppedBlob);
      setBannerPreview(URL.createObjectURL(croppedBlob));
    }
  }
  function validate() {
    const errs = {};
    if (!name.trim()) errs.name = "Name is required";
    if (!validatePhone(phone).valid) errs.phone = validatePhone(phone).error;
    if (!validateUpiId(upiId).valid) errs.upiId = validateUpiId(upiId).error;
    setErrors(errs);
    return !Object.keys(errs).length;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      let profilePicture = profile?.profilePicture ?? "";
      let bannerImage = profile?.bannerImage ?? "";

      if (avatarFile) {
        profilePicture = await driveApi.uploadProfilePhoto(avatarFile);
      }
      if (bannerFile) {
        bannerImage = await driveApi.uploadBanner(bannerFile);
      }

      const ts = Math.floor(Date.now() / 1000);
      const data = {
        name: name.trim(),
        phone: formatPhone(phone),
        upiId: upiId.trim(),
        profilePicture,
        bannerImage,
        updatedAt: ts,
      };
      await publishOwnerProfile(data, secretKey);
      await db.ownerProfiles.put({ pubkey, ...data });
      setAvatar(
        profilePicture ? driveApi.constructor.imageUrl(profilePicture) : null,
      );

      setBannerPreview(
        bannerImage ? driveApi.constructor.imageUrl(bannerImage) : null,
      );
      setAvatarFile(null);
      setBannerFile(null);
      showSnackbar("Profile saved!", "success");
    } catch (err) {
      showSnackbar("Error: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout title="Owner Profile">
      <Box sx={{ p: 2, pb: 4 }}>
        {/* Banner + Avatar Section */}
        <ProfileMedia
          avatarSrc={
            avatar ||
            (profile?.profilePicture
              ? driveApi.constructor.imageUrl(profile.profilePicture)
              : null)
          }
          bannerSrc={
            bannerPreview ||
            (profile?.bannerImage
              ? driveApi.constructor.imageUrl(profile.bannerImage)
              : null)
          }
          editable={true}
          onAvatarChange={handleAvatarChange}
          onBannerChange={handleBannerChange}
          name={name}
          cacheKey={profile?.updatedAt}
        />

        <Stack spacing={2.5}>
          <TextField
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={!!errors.name}
            helperText={errors.name}
          />
          <TextField
            label="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            placeholder="+91 98765 43210"
            error={!!errors.phone}
            helperText={errors.phone}
          />
          <TextField
            label="UPI ID"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            placeholder="yourname@upi"
            error={!!errors.upiId}
            helperText={errors.upiId}
          />

          <Alert severity="info" sx={{ borderRadius: 1 }}>
            Your UPI ID is shared with riders only in encrypted booking
            messages.
          </Alert>

          <Button
            variant="contained"
            size="large"
            onClick={handleSave}
            disabled={saving}
            sx={{ py: 1.5 }}
          >
            {saving ? (
              <CircularProgress size={22} sx={{ color: "#fff" }} />
            ) : (
              "Save Profile"
            )}
          </Button>
        </Stack>

        {/* Crop Dialog */}
        <ImageCropDialog
          open={cropDialogOpen}
          imageSrc={cropType === "avatar" ? avatarCropSrc : bannerCropSrc}
          onClose={() => {
            if (cropType === "avatar" && avatarCropSrc) {
              URL.revokeObjectURL(avatarCropSrc);
              setAvatarCropSrc(null);
            } else if (cropType === "banner" && bannerCropSrc) {
              URL.revokeObjectURL(bannerCropSrc);
              setBannerCropSrc(null);
            }
            setCropDialogOpen(false);
          }}
          onCrop={handleCropComplete}
          {...CROP_PRESETS[cropType]}
        />
      </Box>
    </AppLayout>
  );
}
