import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { MedicineWithSchedule } from '@/Interfaces/interface';

export interface MedicineState {
  medicines: MedicineWithSchedule[];
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
}

const initialState: MedicineState = {
  medicines: [],
  loading: false,
  actionLoading: false,
  error: null,
};

// Async Thunk: Fetch all medicines (with Redux cache guard)
export const fetchMedicines = createAsyncThunk<
  MedicineWithSchedule[],
  boolean | void,
  { state: { medicine: MedicineState } }
>(
  'medicine/fetchMedicines',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/medicareDB');
      return response.data.result || [];
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch medicines');
    }
  },
  {
    condition: (forceReload, { getState }) => {
      if (forceReload) return true;
      const { medicine } = getState();
      // Skip API request if data is already loaded or currently loading
      if (medicine.medicines.length > 0 || medicine.loading) {
        return false;
      }
    },
  }
);

// Async Thunk: Add new medicine schedule
export const addMedicineSchedule = createAsyncThunk(
  'medicine/addMedicineSchedule',
  async (payload: any, { rejectWithValue }) => {
    try {
      const response = await axios.post('/api/medicareDB', payload);
      return response.data.result;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create schedule');
    }
  }
);

// Async Thunk: Update existing medicine schedule
export const updateMedicineSchedule = createAsyncThunk(
  'medicine/updateMedicineSchedule',
  async ({ id, payload }: { id: string; payload: any }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`/api/medicareDB/${id}`, payload);
      return response.data.result;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update schedule');
    }
  }
);

// Async Thunk: Delete/Mark dose completed
export const deleteDose = createAsyncThunk(
  'medicine/deleteDose',
  async ({ doseId, medicineId }: { doseId: string; medicineId: string }, { rejectWithValue }) => {
    try {
      await axios.delete(`/api/medicareDB/${doseId}`);
      return { doseId, medicineId };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update dose');
    }
  }
);

// Async Thunk: Delete whole medicine
export const deleteMedicine = createAsyncThunk(
  'medicine/deleteMedicine',
  async (medicineId: string, { rejectWithValue }) => {
    try {
      await axios.delete(`/api/medicareDB/${medicineId}`);
      return medicineId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete medicine');
    }
  }
);

// Async Thunk: Resolve Missed Dose
export const resolveMissedDose = createAsyncThunk(
  'medicine/resolveMissedDose',
  async (
    {
      medicineId,
      doseId,
      action,
    }: {
      medicineId: string;
      doseId: string;
      action: 'skip_and_continue' | 'carry_forward_shift';
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await axios.post('/api/medicareDB/missedDose', {
        medicineId,
        doseId,
        action,
      });
      return response.data.result;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to resolve missed dose'
      );
    }
  }
);

const medicineSlice = createSlice({
  name: 'medicine',
  initialState,
  reducers: {
    setMedicines(state, action: PayloadAction<MedicineWithSchedule[]>) {
      state.medicines = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Medicines
      .addCase(fetchMedicines.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMedicines.fulfilled, (state, action) => {
        state.loading = false;
        state.medicines = action.payload;
      })
      .addCase(fetchMedicines.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Add Medicine Schedule
      .addCase(addMedicineSchedule.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(addMedicineSchedule.fulfilled, (state, action) => {
        state.actionLoading = false;
        if (action.payload) {
          state.medicines.push(action.payload);
        }
      })
      .addCase(addMedicineSchedule.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload as string;
      })

      // Update Medicine Schedule
      .addCase(updateMedicineSchedule.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(updateMedicineSchedule.fulfilled, (state, action) => {
        state.actionLoading = false;
        if (action.payload && action.payload._id) {
          state.medicines = state.medicines.map((med) =>
            med._id === action.payload._id ? action.payload : med
          );
        }
      })
      .addCase(updateMedicineSchedule.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload as string;
      })

      // Delete Dose
      .addCase(deleteDose.fulfilled, (state, action) => {
        const { doseId, medicineId } = action.payload;
        state.medicines = state.medicines
          .map((med) => {
            if (med._id === medicineId) {
              const updatedSchedule = med.schedule
                .map((sch) => ({
                  ...sch,
                  doses: sch.doses.filter((d) => d._id !== doseId),
                }))
                .filter((sch) => sch.doses.length > 0);

              return { ...med, schedule: updatedSchedule };
            }
            return med;
          })
          .filter((med) => med.schedule.length > 0);
      })

      // Delete Medicine
      .addCase(deleteMedicine.fulfilled, (state, action: PayloadAction<string>) => {
        state.medicines = state.medicines.filter((med) => med._id !== action.payload);
      })

      // Resolve Missed Dose
      .addCase(resolveMissedDose.fulfilled, (state, action) => {
        if (action.payload && action.payload._id) {
          state.medicines = state.medicines.map((med) =>
            med._id === action.payload._id ? action.payload : med
          );
        }
      });
  },
});

export const { setMedicines } = medicineSlice.actions;
export default medicineSlice.reducer;
