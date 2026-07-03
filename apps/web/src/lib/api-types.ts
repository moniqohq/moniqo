/*
 * Moniqo is a personal finance management application designed to help users
 * track, manage, and optimize their financial activities.
 *
 * Copyright (C) 2026 Moniqo <support@moniqo.in>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

export interface ApiUser {
  id: number;
  name: string | null;
  username: string;
  email: string;
  picture: string;
  status: "pending_verification" | "active";
  last_login: string | null;
  created_at: string;
}

export interface ApiAuthTokens {
  access_token: string;
  token_type: string;
  refresh_token: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  msg: string;
}

export interface ApiValidationError {
  success: false;
  data: { fields: Array<{ field: string; message: string }> };
  msg: string;
}
