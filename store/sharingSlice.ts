import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';

export type CollabRole = 'readonly' | 'collaborator' | 'admin';

export interface Collaboration {
  accessId: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  role: CollabRole;
}

export interface SharingState {
  /** The ownerId whose schedule we're currently viewing (null = own schedule) */
  viewingOwnerId: string | null;
  viewingOwnerName: string | null;
  viewingOwnerEmail: string | null;
  /** Effective role in the viewed schedule (null = own schedule, no role needed) */
  role: CollabRole | null;
  /** List of accepted collaborations — schedules this user can view-as */
  collaborations: Collaboration[];
  collaborationsLoaded: boolean;
  loading: boolean;
}

const initialState: SharingState = {
  viewingOwnerId: null,
  viewingOwnerName: null,
  viewingOwnerEmail: null,
  role: null,
  collaborations: [],
  collaborationsLoaded: false,
  loading: false,
};

/** Fetch the schedules this user has been granted access to */
export const fetchMyCollaborations = createAsyncThunk<
  Collaboration[],
  void,
  { state: { sharing: SharingState } }
>(
  'sharing/fetchMyCollaborations',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/sharing');
      const raw = response.data.result?.myCollaborations || [];
      return raw.map((item: any) => ({
        accessId: item._id,
        ownerId: item.ownerId?._id || item.ownerId,
        ownerName: item.ownerId?.name || 'Unknown',
        ownerEmail: item.ownerId?.email || '',
        role: item.role,
      }));
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch collaborations');
    }
  },
  {
    // Only fetch once per session unless forced
    condition: (_, { getState }) => {
      const { sharing } = getState();
      return !sharing.collaborationsLoaded && !sharing.loading;
    },
  }
);

const sharingSlice = createSlice({
  name: 'sharing',
  initialState,
  reducers: {
    setViewAs(
      state,
      action: PayloadAction<{
        ownerId: string;
        ownerName: string;
        ownerEmail: string;
        role: CollabRole;
      }>
    ) {
      state.viewingOwnerId = action.payload.ownerId;
      state.viewingOwnerName = action.payload.ownerName;
      state.viewingOwnerEmail = action.payload.ownerEmail;
      state.role = action.payload.role;
    },
    clearViewAs(state) {
      state.viewingOwnerId = null;
      state.viewingOwnerName = null;
      state.viewingOwnerEmail = null;
      state.role = null;
    },
    clearCollaborations(state) {
      state.collaborations = [];
      state.collaborationsLoaded = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyCollaborations.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMyCollaborations.fulfilled, (state, action) => {
        state.loading = false;
        state.collaborations = action.payload;
        state.collaborationsLoaded = true;
      })
      .addCase(fetchMyCollaborations.rejected, (state) => {
        state.loading = false;
        state.collaborationsLoaded = true; // Avoid infinite retry
      });
  },
});

export const { setViewAs, clearViewAs, clearCollaborations } = sharingSlice.actions;
export default sharingSlice.reducer;
