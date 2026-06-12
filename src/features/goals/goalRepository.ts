export interface Goal {
  id: string;
  name: string;
  target: number;
  current: number;
}

export const goalRepository = {
  async list(): Promise<Goal[]> {
    return [
      { id: 'goal-reserve', name: 'Reserva de emergencia', target: 12000, current: 3800 },
      { id: 'goal-travel', name: 'Viagem', target: 5000, current: 1450 },
    ];
  },
};
