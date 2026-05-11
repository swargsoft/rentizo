import {
  Box,
  Typography,
  Fab,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  InputAdornment,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import { useNavigate, useParams } from "react-router-dom";
import { useState, useMemo } from "react";
import AppLayout from "@/components/Common/AppLayout.jsx";
import ListingCard from "@/components/Listing/ListingCard.jsx";
import { ListSkeleton } from "@/components/Common/LoadingSkeleton.jsx";
import { useOwnerListingsByBranch } from "@/hooks/useListings.js";
import { useListingImages } from "@/hooks/useImageCache.js";
import { useBranch } from "@/hooks/useBranches.js";
import { VEHICLE_TYPES, AVAILABILITY_STATUS } from "@/utils/constants.js";

function ListingRow({ listing, branchId }) {
  const navigate = useNavigate();

  // useListingImages now takes the full listing and returns URL array directly
  const imageUrls = useListingImages(listing);

  return (
    <ListingCard
      listing={listing}
      imageUrls={imageUrls}
      showEdit
      onEdit={() => navigate(`/owner/listings/${listing.id}/edit`)}
      onShare={() => {
        console.log("test sharing");
      }}
    />
  );
}

export default function OwnerListings() {
  const navigate = useNavigate();
  const { branchId } = useParams();
  const branch = useBranch(branchId);
  const listings = useOwnerListingsByBranch(branchId);

  const [searchQuery, setSearchQuery] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("");
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState("");

  const filteredListings = useMemo(() => {
    if (!listings) return [];
    return listings.filter((listing) => {
      const matchesSearch =
        searchQuery === "" ||
        listing.vehicleName
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        listing.vehicleNumber
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase());

      const isAvailable = !listing.isBooked && listing.isPublished;
      const matchesAvailability =
        availabilityFilter === "" ||
        (availabilityFilter === "Available" && isAvailable) ||
        (availabilityFilter === "Not Available" && !isAvailable);

      const matchesType =
        vehicleTypeFilter === "" || listing.vehicleType === vehicleTypeFilter;

      return matchesSearch && matchesAvailability && matchesType;
    });
  }, [listings, searchQuery, availabilityFilter, vehicleTypeFilter]);

  return (
    <AppLayout title={`${branch?.branchName} - Listings`} showBack>
      <Box sx={{ p: 2 }}>
        <Box sx={{ mb: 2, display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            placeholder="Search by vehicle name or number"
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "text.secondary", fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 1,
              },
            }}
          />

          <Box sx={{ display: "flex", gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 140, flex: 1 }}>
              <InputLabel>Availability</InputLabel>
              <Select
                value={availabilityFilter}
                label="Availability"
                onChange={(e) => setAvailabilityFilter(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                {AVAILABILITY_STATUS.map((status) => (
                  <MenuItem key={status.value} value={status.value}>
                    {status.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 140, flex: 1 }}>
              <InputLabel>Vehicle Type</InputLabel>
              <Select
                value={vehicleTypeFilter}
                label="Vehicle Type"
                onChange={(e) => setVehicleTypeFilter(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                {VEHICLE_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>
        {listings === undefined ? (
          <ListSkeleton />
        ) : !filteredListings.length ? (
          <Box sx={{ textAlign: "center", pt: 8 }}>
            {searchQuery || availabilityFilter || vehicleTypeFilter ? (
              <>
                <Typography
                  variant="h6"
                  sx={{ color: "text.secondary", mb: 1 }}
                >
                  No matching vehicles
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Try adjusting your search or filters.
                </Typography>
              </>
            ) : (
              <>
                <Typography
                  variant="h6"
                  sx={{ color: "text.secondary", mb: 1 }}
                >
                  No vehicles yet
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Tap + to add your first vehicle listing.
                </Typography>
              </>
            )}
          </Box>
        ) : (
          filteredListings.map((l) => (
            <ListingRow key={l.id} listing={l} branchId={branchId} />
          ))
        )}
      </Box>

      <Fab
        color="primary"
        onClick={() => navigate(`/owner/branches/${branchId}/listings/new`)}
        sx={{ position: "fixed", bottom: 80, right: 20 }}
      >
        <AddIcon />
      </Fab>
    </AppLayout>
  );
}
