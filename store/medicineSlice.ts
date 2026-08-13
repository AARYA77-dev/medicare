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

// Async Thunk: Fetch all medicines
export const fetchMedicines = createAsyncThunk(
  'medicine/fetchMedicines',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/medicareDB');
      return response.data.result || [];
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch medicines');
    }
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
      });
  },
});

export const { setMedicines } = medicineSlice.actions;
export default medicineSlice.reducer;
