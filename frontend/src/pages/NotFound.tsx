import React from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { Construction } from 'lucide-react';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <Card className="max-w-md w-full p-12 text-center">
        <Construction className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Strona w budowie</h1>
        <p className="text-gray-600 mb-6">
          Ta funkcjonalność jest aktualnie przygotowywana. Wróć wkrótce!
        </p>
        <Button onClick={() => navigate('/dashboard')} className="w-full">
          Wróć do Dashboard
        </Button>
      </Card>
    </div>
  );
}
