import axios from "axios"
import type {
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios"
import type { ResponseMode } from "@assistant/shared"

interface Envelope<T> {
  data: T
}

declare module "axios" {
  interface InternalAxiosRequestConfig {
    responseMode?: ResponseMode
    unwrapResponse?: boolean
  }
}

const client = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
})

client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const responseMode = config.responseMode ?? "json"

  config.headers = config.headers ?? {}
  config.headers["x-response-mode"] = responseMode

  if (responseMode === "stream") {
    config.headers.Accept = "text/event-stream"
  } else {
    config.headers.Accept = "application/json"
  }

  if (typeof config.unwrapResponse === "undefined") {
    config.unwrapResponse = true
  }

  return config
})

client.interceptors.response.use(
  <T>(response: AxiosResponse<Envelope<T> | T>) => {
    if (response.config.unwrapResponse === false) {
      return response
    }

    const payload = response.data as Envelope<T> | T

    if (
      payload &&
      typeof payload === "object" &&
      "data" in (payload as Record<string, unknown>)
    ) {
      return (payload as Envelope<T>).data
    }

    return payload
  },
  (error: AxiosError<{ message?: string }>) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      "请求失败，请稍后再试。"

    return Promise.reject(new Error(message))
  },
)

async function request<T>(config: AxiosRequestConfig) {
  const response = await client.request<T>(config)
  return response as unknown as T
}

async function get<T>(url: string, config?: AxiosRequestConfig) {
  return request<T>({
    ...config,
    method: "GET",
    url,
  })
}

async function post<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
) {
  return request<T>({
    ...config,
    method: "POST",
    url,
    data,
  })
}

export const http = {
  request,
  get,
  post,
}
