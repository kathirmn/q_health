export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      clinics: {
        Row: {
          id: string;
          name: string;
          location: string;
          base_consult_time: number;
          doctor_name: string;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          location: string;
          base_consult_time?: number;
          doctor_name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          location?: string;
          base_consult_time?: number;
          doctor_name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      appointments: {
        Row: {
          id: number;
          token_id: number;
          patient_name: string;
          type: 'online' | 'walk-in';
          status: 'waiting' | 'in-progress' | 'completed';
          clinic_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          token_id: number;
          patient_name: string;
          type: 'online' | 'walk-in';
          status?: 'waiting' | 'in-progress' | 'completed';
          clinic_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          token_id?: number;
          patient_name?: string;
          type?: 'online' | 'walk-in';
          status?: 'waiting' | 'in-progress' | 'completed';
          clinic_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "appointments_clinic_id_fkey";
            columns: ["clinic_id"];
            referencedRelation: "clinics";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
