export type ServiceVariant = {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
};

export type ServiceItem = {
  id: string;
  name: string;
  description: string | null;
  variants: ServiceVariant[];
};

export type ServiceCategory = {
  id: string;
  name: string;
  services: ServiceItem[];
};

export type StaffOption = {
  id: string;
  name: string;
};

export type DaySlot = {
  startTime: string;
  endTime: string;
  availableStaffIds: string[];
};

export type DaySlots = {
  date: string;
  slots: DaySlot[];
};

export type SelectedVariant = ServiceVariant & { serviceName: string };

export type BookingResult = {
  appointmentIds: string[];
  staffId: string;
  date: string;
  startTime: string;
  requiresDeposit: boolean;
  depositAmount: number;
  depositExpiresAt: string;
};
