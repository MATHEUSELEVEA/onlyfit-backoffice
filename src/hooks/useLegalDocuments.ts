import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listLegalDocuments, publishLegalDocument, setLegalDocumentActive } from '../lib/legalDocuments';

export function useLegalDocuments() {
  return useQuery({ queryKey: ['legal-documents'], queryFn: listLegalDocuments, staleTime: 15_000 });
}

export function usePublishLegalDocument() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: publishLegalDocument,
    onSuccess: () => client.invalidateQueries({ queryKey: ['legal-documents'] }),
  });
}

export function useSetLegalDocumentActive() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ key, active }: { key: string; active: boolean }) => setLegalDocumentActive(key, active),
    onSuccess: () => client.invalidateQueries({ queryKey: ['legal-documents'] }),
  });
}
