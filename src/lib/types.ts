export type Player = {
  id: string;
  name: string;
};

export type Trip = {
  code: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  players: Player[];
};
