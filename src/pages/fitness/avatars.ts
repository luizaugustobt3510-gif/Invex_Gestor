import mei from '@/assets/fitness-avatars/mei.png';
import luna from '@/assets/fitness-avatars/luna.png';
import kai from '@/assets/fitness-avatars/kai.png';
import jax from '@/assets/fitness-avatars/jax.png';

export interface FitnessAvatar {
  id: string;
  nome: string;
  genero: 'f' | 'm' | 'n';
  src: string;
  cor: string;
}

export const FITNESS_AVATARS: FitnessAvatar[] = [
  { id: 'mei', nome: 'Mei', genero: 'f', src: mei, cor: '#22d3ee' },
  { id: 'luna', nome: 'Luna', genero: 'f', src: luna, cor: '#e879f9' },
  { id: 'kai', nome: 'Kai', genero: 'm', src: kai, cor: '#60a5fa' },
  { id: 'jax', nome: 'Jax', genero: 'm', src: jax, cor: '#67e8f9' },
];

export const getAvatar = (id: string): FitnessAvatar =>
  FITNESS_AVATARS.find(a => a.id === id) || FITNESS_AVATARS[0];
