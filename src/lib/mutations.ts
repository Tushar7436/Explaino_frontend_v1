import { gql } from '@apollo/client';

export const REGISTER_WITHOUT_PASSWORD_V4 = gql`
  mutation RegisterV3($phone: String!, $recaptcha_token: String!) {
    registerWithoutPasswordV3(credentials: {phone: $phone, recaptcha_token: $recaptcha_token}) {
      request_id
      status
    }
  }
`;

export const CHECK_CLIENT_AND_USER_QUERY = `
  query CheckClientAndUser($id: uuid!) {
    vocallabs_client_by_pk(id: $id) {
      id
    }
    subspace {
      auth(where: {id: {_eq: $id}}) {
        fullname
        email
        username
        phone
      }
    }
  }
`;

export const CHECK_COMPANY_QUERY = `
  query CheckCompany($id: uuid!) {
    vocallabs_client(where: {id: {_eq: $id}}) {
      company_name
      industry
    }
  }
`;

export const UPDATE_USER_DATA_MUTATION = `
  mutation UpdateProfile($id: uuid!, $fullname: String, $email: String, $username: String) {
    subspace {
      update_auth_by_pk(
        pk_columns: { id: $id }
        _set: { fullname: $fullname, email: $email, username: $username }
      ) {
        id
        fullname
        email
        username
      }
    }
  }
`;

export const UPDATE_COMPANY_MUTATION = `
  mutation UpdateCompany($client_id: uuid!, $company_name: String!, $industry: String) {
    update_vocallabs_client_by_pk(
      pk_columns: { id: $client_id },
      _set: { company_name: $company_name, industry: $industry }
    ) {
      id
      company_name
      industry
    }
  }
`;

export const GET_INDUSTRIES_QUERY = `
  query GetIndustries {
    vocallabs_industries(order_by: {name: asc}) {
      name
    }
  }
`;
