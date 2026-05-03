import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, Handoff, HandoffCreatePayload } from "@/api/client";

export const useThreads = () =>
  useQuery({ queryKey: ["threads"], queryFn: () => api.getThreads() });

export const useHandoffs = (params?: {
  thread_name?: string;
  limit?: number;
  offset?: number;
}) =>
  useQuery({
    queryKey: ["handoffs", params],
    queryFn: () => api.getHandoffs(params),
  });

export const useHandoff = (id: string) =>
  useQuery({
    queryKey: ["handoff", id],
    queryFn: () => api.getHandoff(id),
    enabled: !!id,
  });

export const useConfig = () =>
  useQuery({ queryKey: ["config"], queryFn: () => api.getConfig() });

export const useCreateHandoff = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: HandoffCreatePayload) => api.createHandoff(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["handoffs"] });
      qc.invalidateQueries({ queryKey: ["threads"] });
    },
  });
};

export const useUpdateHandoff = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<HandoffCreatePayload> }) =>
      api.updateHandoff(id, data),
    onSuccess: (data: Handoff) => {
      qc.invalidateQueries({ queryKey: ["handoffs"] });
      qc.invalidateQueries({ queryKey: ["handoff", data.handoff_id] });
    },
  });
};

export const useDeleteHandoff = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteHandoff(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["handoffs"] });
      qc.invalidateQueries({ queryKey: ["threads"] });
    },
  });
};
