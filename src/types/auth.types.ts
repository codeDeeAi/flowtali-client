export interface IOrganizationRole {
  id: string;
  name: string;
  permissions: string[];
}

export interface IOrganization {
  id: string;
  name: string;
  type: string;
  logo: string | null;
  is_owner: boolean;
  roles: IOrganizationRole[];
  permissions: string[];
  require_mfa?: boolean;
}

export interface ILoginData {
  first_name: string;
  last_name: string;
  avatar: string | null;
  token: string;
  mfa_enabled: boolean;
  organizations: IOrganization[];
}
