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
          doctor_name?: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          location: string;
          base_consult_time?: number;
          doctor_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          location?: string;
          base_consult_time?: number;
          doctor_name?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      doctors: {
        Row: {
          id: string;
          clinic_id: string;
          name: string;
          specialty: string;
          cabin_number: string;
          created_at: string;
        };
        Insert: {
          id: string;
          clinic_id: string;
          name: string;
          specialty: string;
          cabin_number?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          clinic_id?: string;
          name?: string;
          specialty?: string;
          cabin_number?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "doctors_clinic_id_fkey";
            columns: ["clinic_id"];
            referencedRelation: "clinics";
            referencedColumns: ["id"];
          }
        ];
      };
      appointments: {
        Row: {
          id: string | number;
          token_number?: number;
          token_id?: number;
          patient_name: string;
          status: 'waiting' | 'in-progress' | 'completed';
          is_walk_in?: boolean;
          type?: 'online' | 'walk-in';
          clinic_id?: string | null;
          doctor_id?: string | null;
          doctor_name?: string | null;
          created_at: string;
        };
        Insert: {
          id?: string | number;
          token_number?: number;
          token_id?: number;
          patient_name: string;
          status?: 'waiting' | 'in-progress' | 'completed';
          is_walk_in?: boolean;
          type?: 'online' | 'walk-in';
          clinic_id?: string | null;
          doctor_id?: string | null;
          doctor_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string | number;
          token_number?: number;
          token_id?: number;
          patient_name?: string;
          status?: 'waiting' | 'in-progress' | 'completed';
          is_walk_in?: boolean;
          type?: 'online' | 'walk-in';
          clinic_id?: string | null;
          doctor_id?: string | null;
          doctor_name?: string | null;
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
