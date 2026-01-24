import { GET_EXPLAINO_PROJECTS_QUERY } from '../lib/mutations';

const GRAPHQL_ENDPOINT = 'https://db.vocallabs.ai/v1/graphql';

interface Project {
  project_name: string;
  created_at: string;
  updated_at: string;
  client_id: string;
  id: string;
  session_id: string;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

interface GetProjectsResponse {
  vocallabs_Explaino_Projects: Project[];
}

/**
 * Fetch Explaino projects for a specific client
 * @param clientId - The client UUID
 * @returns Array of projects or null if failed
 */
export const fetchExplainoProjects = async (clientId: string): Promise<Project[] | null> => {
  try {
    const authToken = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
    
    if (!authToken) {
      console.error('No auth token found');
      return null;
    }

    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        query: GET_EXPLAINO_PROJECTS_QUERY,
        variables: {
          client_id: clientId,
        },
      }),
    });

    if (!response.ok) {
      console.error(`GraphQL request failed with status ${response.status}`);
      return null;
    }

    const result: GraphQLResponse<GetProjectsResponse> = await response.json();

    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      return null;
    }

    return result.data?.vocallabs_Explaino_Projects || [];
  } catch (error) {
    console.error('Error fetching projects:', error);
    return null;
  }
};
