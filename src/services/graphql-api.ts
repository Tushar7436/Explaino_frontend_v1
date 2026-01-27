import { GET_EXPLAINO_PROJECTS_QUERY, UPDATE_EXPLAINO_PROJECT_NAME, DELETE_EXPLAINO_PROJECT } from '../lib/mutations';

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

interface UpdateProjectNameResponse {
  update_vocallabs_Explaino_Projects: {
    affected_rows: number;
    returning: Project[];
  };
}

interface DeleteProjectResponse {
  delete_vocallabs_Explaino_Projects: {
    affected_rows: number;
    returning: Project[];
  };
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

/**
 * Update an Explaino project name
 * @param projectId - The project UUID
 * @param projectName - The new project name
 * @returns Updated project or null if failed
 */
export const updateExplainoProjectName = async (projectId: string, projectName: string): Promise<Project | null> => {
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
        query: UPDATE_EXPLAINO_PROJECT_NAME,
        variables: {
          id: projectId,
          project_name: projectName,
        },
      }),
    });

    if (!response.ok) {
      console.error(`GraphQL request failed with status ${response.status}`);
      return null;
    }

    const result: GraphQLResponse<UpdateProjectNameResponse> = await response.json();

    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      return null;
    }

    const updatedProjects = result.data?.update_vocallabs_Explaino_Projects?.returning;
    return updatedProjects && updatedProjects.length > 0 ? updatedProjects[0] : null;
  } catch (error) {
    console.error('Error updating project name:', error);
    return null;
  }
};

/**
 * Delete an Explaino project
 * @param projectId - The project UUID
 * @returns true if deletion was successful, false otherwise
 */
export const deleteExplainoProject = async (projectId: string): Promise<boolean> => {
  try {
    const authToken = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
    
    if (!authToken) {
      console.error('No auth token found');
      return false;
    }

    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        query: DELETE_EXPLAINO_PROJECT,
        variables: {
          id: projectId,
        },
      }),
    });

    if (!response.ok) {
      console.error(`GraphQL request failed with status ${response.status}`);
      return false;
    }

    const result: GraphQLResponse<DeleteProjectResponse> = await response.json();

    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      return false;
    }

    const affectedRows = result.data?.delete_vocallabs_Explaino_Projects?.affected_rows || 0;
    return affectedRows > 0;
  } catch (error) {
    console.error('Error deleting project:', error);
    return false;
  }
};
