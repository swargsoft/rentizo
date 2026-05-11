/**
 * ListingCard.jsx — Rentizo
 *
 * Refactored from the original horizontal card into a full vertical card layout
 * with an embla-powered image carousel in the media section.
 *
 * Install dependency (once):
 *   pnpm add embla-carousel-react
 *
 * Props:
 *   listing       {object}   — vehicle listing object (see shape below)
 *   imageUrls     {string[]} — ordered array of image URLs for the carousel
 *   onEdit        {fn}       — called when Edit is tapped
 *   onBook        {fn}       — called when Book is tapped
 *   onShare       {fn}       — called when Share is tapped
 *
 * listing shape (relevant fields):
 *   vehicleName       string
 *   vehicleNumber     string
 *   vehicleType       'bike' | 'scooter' | 'cycle' | 'car' | 'other'
 *   quantity          number
 *   description       string  (optional)
 *   pricePerDay       number
 *   discountedPrice   number  (optional — enables discount UI when < pricePerDay)
 *   isPublished       bool
 *   isBooked          bool
 */

import useEmblaCarousel from "embla-carousel-react";
import {
  BookmarkAddRounded,
  CheckCircleRounded,
  ChevronLeftRounded,
  ChevronRightRounded,
  CommuteRounded,
  DirectionsBikeRounded,
  DirectionsCarRounded,
  DriveFileRenameOutlineRounded,
  RadioButtonUncheckedRounded,
  ShareRounded,
  BikeScooterRounded,
  TwoWheelerRounded,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  IconButton,
  Stack,
  Typography,
  Zoom,
} from "@mui/material";
import { styled, useTheme } from "@mui/material/styles";
import { useCallback, useEffect, useState } from "react";
import { formatINR } from "@/utils/upi.js";
import { VEHICLE_TYPES } from "@/utils/constants.js";

// ─── Styled helpers (mirrors PackageCard patterns) ──────────────────────────

const PriceContainer = styled(Box)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.primary.main}18, ${theme.palette.primary.main}05)`,
  borderRadius: theme.spacing(2),
  padding: theme.spacing(1.5, 2),
  border: `1px solid ${theme.palette.primary.main}22`,
  position: "relative",
}));

const DiscountBadge = styled(Chip)(({ theme }) => ({
  position: "absolute",
  top: -13,
  right: theme.spacing(2),
  zIndex: 2,
  fontWeight: 700,
  fontSize: "0.7rem",
  height: 22,
  boxShadow: theme.shadows[3],
  backgroundColor: theme.palette.success.main,
  color: theme.palette.success.contrastText,
}));

// ─── Vehicle meta maps ───────────────────────────────────────────────────────

const VEHICLE_ICONS = {
  bike: TwoWheelerRounded,
  scooter: TwoWheelerRounded,
  cycle: DirectionsBikeRounded,
  car: DirectionsCarRounded,
  other: CommuteRounded,
};

const VEHICLE_LABELS = Object.fromEntries(
  VEHICLE_TYPES.map((v) => [v.value, v.label]),
);

// ─── Embla-powered carousel ──────────────────────────────────────────────────

function ListingCarousel({ urls = [], height = 210 }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    dragFree: false,
  });
  const [current, setCurrent] = useState(0);
  const theme = useTheme();

  // Keep dot state in sync with scroll snaps
  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setCurrent(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    return () => emblaApi.off("select", onSelect);
  }, [emblaApi]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  // Empty state
  if (!urls.length) {
    return (
      <Box
        sx={{
          height,
          bgcolor: "background.paper",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
        }}
      >
        <BikeScooterRounded sx={{ fontSize: 52, color: "action.disabled" }} />
        <Typography variant="caption" color="text.disabled">
          No photos
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ position: "relative", height, overflow: "hidden" }}>
      {/* Embla viewport */}
      <Box ref={emblaRef} sx={{ overflow: "hidden", height: "100%" }}>
        <Box sx={{ display: "flex", height: "100%" }}>
          {urls.map((url, i) => (
            <Box
              key={i}
              component="img"
              src={url}
              alt=""
              sx={{
                flex: "0 0 100%",
                minWidth: 0,
                height: "100%",
                objectFit: "cover",
                pointerEvents: "none",
                userSelect: "none",
              }}
            />
          ))}
        </Box>
      </Box>

      {/* Prev / Next arrows — only when multiple images */}
      {urls.length > 1 && (
        <>
          <IconButton
            onClick={scrollPrev}
            size="small"
            sx={{
              position: "absolute",
              left: 8,
              top: "50%",
              transform: "translateY(-50%)",
              bgcolor: "rgba(0,0,0,0.55)",
              color: "#fff",
              width: 30,
              height: 30,
              "&:hover": { bgcolor: "rgba(0,0,0,0.75)" },
            }}
          >
            <ChevronLeftRounded fontSize="small" />
          </IconButton>

          <IconButton
            onClick={scrollNext}
            size="small"
            sx={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              bgcolor: "rgba(0,0,0,0.55)",
              color: "#fff",
              width: 30,
              height: 30,
              "&:hover": { bgcolor: "rgba(0,0,0,0.75)" },
            }}
          >
            <ChevronRightRounded fontSize="small" />
          </IconButton>

          {/* Dot indicators */}
          <Box
            sx={{
              position: "absolute",
              bottom: 10,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: 0.75,
              alignItems: "center",
            }}
          >
            {urls.map((_, i) => (
              <Box
                key={i}
                onClick={() => emblaApi?.scrollTo(i)}
                sx={{
                  width: i === current ? 20 : 6,
                  height: 6,
                  borderRadius: 3,
                  bgcolor:
                    i === current
                      ? theme.palette.primary.main
                      : "rgba(255,255,255,0.45)",
                  cursor: "pointer",
                  transition: "width 0.25s ease, background-color 0.25s ease",
                  boxShadow:
                    i === current
                      ? `0 0 6px ${theme.palette.primary.main}`
                      : "none",
                }}
              />
            ))}
          </Box>

          {/* Counter badge */}
          <Box
            sx={{
              position: "absolute",
              top: 10,
              right: 10,
              bgcolor: "rgba(0,0,0,0.55)",
              borderRadius: 10,
              px: 1,
              py: 0.25,
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: "#fff", fontWeight: 700, fontSize: "0.68rem" }}
            >
              {current + 1} / {urls.length}
            </Typography>
          </Box>
        </>
      )}
    </Box>
  );
}

// ─── Main ListingCard ────────────────────────────────────────────────────────

export default function ListingCard({
  listing,
  imageUrls = [],
  onEdit,
  onBook,
  onShare,
}) {
  const isAvailable = !listing.isBooked && listing.isPublished;

  const VehicleIcon = VEHICLE_ICONS[listing.vehicleType] ?? CommutRounded;
  const vehicleLabel =
    VEHICLE_LABELS[listing.vehicleType] ?? listing.vehicleType;

  const hasDiscount =
    listing.discountedPrice && listing.discountedPrice < listing.pricePerDay;
  const discountedAmt = hasDiscount
    ? listing.discountedPrice
    : listing.pricePerDay;
  const discountPct = hasDiscount
    ? Math.ceil(
        ((listing.pricePerDay - listing.discountedPrice) /
          listing.pricePerDay) *
          100,
      )
    : 0;

  const showActions = onEdit || onBook || onShare;

  return (
    <Zoom in>
      <Card
        sx={{
          mb: 2,
          position: "relative",
          overflow: "visible", // needed for DiscountBadge overflow
        }}
      >
        {/* ── Media section ────────────────────────────────────────────────── */}
        <Box
          sx={{
            borderRadius: "12px 12px 0 0",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <ListingCarousel urls={imageUrls} height={210} />

          {/* Availability indicator — top-left of image */}
          <Box
            sx={{
              position: "absolute",
              top: 10,
              left: 10,
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              bgcolor: "rgba(0,0,0,0.5)",
              borderRadius: 10,
              px: 0.75,
              py: 0.4,
            }}
          >
            {isAvailable ? (
              <CheckCircleRounded
                sx={{ fontSize: 14, color: "success.main" }}
              />
            ) : (
              <RadioButtonUncheckedRounded
                sx={{ fontSize: 14, color: "grey.500" }}
              />
            )}
            <Typography
              variant="caption"
              sx={{
                fontSize: "0.67rem",
                fontWeight: 700,
                color: isAvailable ? "success.main" : "grey.500",
                lineHeight: 1,
              }}
            >
              {!listing.isPublished
                ? "Draft"
                : isAvailable
                  ? "Available"
                  : "Booked"}
            </Typography>
          </Box>
        </Box>

        {/* ── Card header ──────────────────────────────────────────────────── */}
        <CardHeader
          sx={{
            pb: 0.5,
            pt: 1.5,
            alignItems: "flex-start",
            "& .MuiCardHeader-content": {
              minWidth: 0,
              flex: 1,
            },
          }}
          title={
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 700,
                  lineHeight: 1.25,
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 1,
                  textOverflow: "ellipsis",
                }}
              >
                {listing.vehicleName}
              </Typography>
              <Chip
                icon={
                  <VehicleIcon
                    sx={{ fontSize: "15px !important", ml: "6px !important" }}
                  />
                }
                label={`${vehicleLabel} · ${listing.quantity}`}
                size="small"
                sx={{
                  mt: 0.25,
                  mr: 0.5,
                  height: 24,
                  bgcolor: "action.hover",
                  color: "text.secondary",
                  fontWeight: 600,
                  fontSize: "0.72rem",
                  "& .MuiChip-icon": {
                    color: "primary.main",
                  },
                }}
              />
            </Stack>
          }
          subheader={
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontWeight: 500,
              }}
            >
              {listing.vehicleNumbers?.length
                ? listing.vehicleNumbers.map((v) => v.toUpperCase()).join(", ")
                : listing.vehicleNumber?.toUpperCase()}
            </Typography>
          }
        />

        {/* ── Card content ─────────────────────────────────────────────────── */}
        <CardContent sx={{ pt: 1, pb: showActions ? 1 : 1.5 }}>
          {/* Description */}
          {listing.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mb: 1.5,
                lineHeight: 1.55,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 2,
                textOverflow: "ellipsis",
              }}
            >
              {listing.description}
            </Typography>
          )}

          {/* Pricing block */}
          <PriceContainer>
            {hasDiscount && (
              <DiscountBadge label={`${discountPct}% OFF`} size="small" />
            )}

            <Stack direction="row" alignItems="baseline" spacing={1}>
              {/* Effective price */}
              <Typography
                variant="h6"
                color="primary.main"
                sx={{ fontWeight: 800, lineHeight: 1 }}
              >
                {formatINR(discountedAmt)}
                <Typography
                  component="span"
                  variant="caption"
                  sx={{ color: "text.secondary", fontWeight: 400, ml: 0.25 }}
                >
                  /day
                </Typography>
              </Typography>

              {/* Crossed-out original price */}
              {hasDiscount && (
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.disabled",
                    textDecoration: "line-through",
                    fontWeight: 500,
                  }}
                >
                  {formatINR(listing.pricePerDay)}
                </Typography>
              )}
            </Stack>
          </PriceContainer>
        </CardContent>

        {/* ── Action buttons ────────────────────────────────────────────────── */}
        {showActions && (
          <>
            <Divider variant="fullWidth" sx={{ borderStyle: "dashed" }} />
            <CardActions sx={{ px: 1.5, py: 1, gap: 0.75 }}>
              {onShare && (
                <Button
                  variant="outlined"
                  color="info"
                  startIcon={<ShareRounded />}
                  fullWidth
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShare?.();
                  }}
                  sx={{
                    textTransform: "none",
                  }}
                >
                  Share
                </Button>
              )}

              {onBook && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<BookmarkAddRounded />}
                  fullWidth
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onBook?.();
                  }}
                  sx={{
                    textTransform: "none",
                  }}
                >
                  Book
                </Button>
              )}

              {onEdit && (
                <Button
                  variant="outlined"
                  startIcon={<DriveFileRenameOutlineRounded />}
                  fullWidth
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.();
                  }}
                  sx={{
                    textTransform: "none",
                  }}
                >
                  Edit
                </Button>
              )}
            </CardActions>
          </>
        )}
      </Card>
    </Zoom>
  );
}
