import { useCallback, useRef, useState, useEffect } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Header } from '../components/Header';
import { LandingView } from '../components/LandingView';
import { LoadingView } from '../components/LoadingView';
import { ErrorView } from '../components/ErrorView';
import { ResultView } from '../components/ResultView';
import { analyzePost, analyzeFile } from '../services/api';
import { validateUrl } from '../utils/validation';
import type { UIState, InputMode } from '../types/api';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
const MAX_FILE_SIZE = 20 * 1024 * 1024;

export function IndexRoute() {
  const navigate = useNavigate();
  const search: any = useSearch({ strict: false });
  const view = search.view;

  const [state, setState] = useState<UIState>({ type: 'INITIAL' });
  const [url, setUrl] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const resetToInitial = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState({ type: 'INITIAL' });
    setUrl('');
    setValidationError(null);
    setSelectedFile(null);
    setFileError(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (view === 'results') {
      navigate({ to: '/', search: {} });
    }
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [navigate, view, previewUrl]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort('user_cancel');
    abortRef.current = null;
    setState({ type: 'INITIAL' });
  }, []);

  useEffect(() => {
    if (view === 'results') {
      if (state.type !== 'SUCCESS') {
        const stored = sessionStorage.getItem('analyzer_result');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setState({ type: 'SUCCESS', data: parsed.data, source: parsed.source });
          } catch {
            navigate({ to: '/', search: {}, replace: true });
            setState({ type: 'INITIAL' });
          }
        } else {
          navigate({ to: '/', search: {}, replace: true });
          setState({ type: 'INITIAL' });
        }
      }
    } else {
      if (state.type === 'SUCCESS') {
        setState({ type: 'INITIAL' });
      }
    }
  }, [view, state.type, navigate]);

  const handleUrlChange = useCallback((value: string) => {
    setUrl(value);
    setValidationError(null);
    if (state.type === 'ERROR' || state.type === 'SUCCESS') {
      setState({ type: 'INITIAL' });
    }
  }, [state.type]);

  const handleInputModeChange = useCallback((mode: InputMode) => {
    setInputMode(mode);
    setValidationError(null);
    setFileError(null);
    setState((prev) => {
      if (prev.type === 'ERROR' || prev.type === 'SUCCESS') {
        return { type: 'INITIAL' };
      }
      return prev;
    });
  }, []);

  const handleFileSelect = useCallback((file: File | null) => {
    setFileError(null);
    setValidationError(null);

    if (!file) {
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      return;
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFileError('Unsupported file type. Please upload a JPG, PNG, WebP, GIF, or PDF.');
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setFileError('The file is too large. Maximum size is 20 MB.');
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      return;
    }

    setSelectedFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  }, [previewUrl]);

  const doFetchUrl = useCallback((targetUrl: string) => {
    const controller = new AbortController();
    abortRef.current = controller;
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 45000);

    analyzePost(targetUrl, controller.signal)
      .then((response) => {
        clearTimeout(timeoutId);
        if (controller.signal.aborted && !timedOut) return;
        if (response.ok) {
          sessionStorage.setItem('analyzer_result', JSON.stringify({ data: response.data, source: targetUrl }));
          navigate({ to: '/', search: { view: 'results' } });
          setState({ type: 'SUCCESS', data: response.data, source: targetUrl });
        } else {
          setState({
            type: 'ERROR',
            error: response.error,
            source: targetUrl,
            requestId: response.requestId,
          });
        }
      })
      .catch(() => {
        clearTimeout(timeoutId);
        if (controller.signal.aborted && !timedOut) return;
        setState({
          type: 'ERROR',
          error: {
            code: timedOut ? 'FETCH_TIMEOUT' : 'INTERNAL_ERROR',
            message: timedOut ? 'The request took too long.' : 'Something went wrong while processing the request.',
            retryable: true,
          },
          source: targetUrl,
          requestId: '',
        });
      })
      .finally(() => {
        abortRef.current = null;
      });
  }, []);

  const doFetchFile = useCallback((file: File) => {
    const controller = new AbortController();
    abortRef.current = controller;
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 60000);

    analyzeFile(file, controller.signal)
      .then((response) => {
        clearTimeout(timeoutId);
        if (controller.signal.aborted && !timedOut) return;
        if (response.ok) {
          sessionStorage.setItem('analyzer_result', JSON.stringify({ data: response.data, source: file.name }));
          navigate({ to: '/', search: { view: 'results' } });
          setState({ type: 'SUCCESS', data: response.data, source: file.name });
        } else {
          setState({
            type: 'ERROR',
            error: response.error,
            source: file.name,
            requestId: response.requestId,
          });
        }
      })
      .catch(() => {
        clearTimeout(timeoutId);
        if (controller.signal.aborted && !timedOut) return;
        setState({
          type: 'ERROR',
          error: {
            code: timedOut ? 'FETCH_TIMEOUT' : 'INTERNAL_ERROR',
            message: timedOut ? 'The request took too long.' : 'Something went wrong while processing the request.',
            retryable: true,
          },
          source: file.name,
          requestId: '',
        });
      })
      .finally(() => {
        abortRef.current = null;
      });
  }, []);

  const handleSubmit = useCallback(() => {
    if (inputMode === 'url') {
      const trimmed = url.trim();

      if (!trimmed) {
        setValidationError('Please enter a LinkedIn, Instagram, or X post URL.');
        inputRef.current?.focus();
        return;
      }

      const result = validateUrl(trimmed);
      if (!result.valid) {
        setValidationError(result.message);
        inputRef.current?.focus();
        return;
      }

      setValidationError(null);
      setState({ type: 'LOADING', source: trimmed });
      doFetchUrl(trimmed);
    } else {
      if (!selectedFile) {
        setFileError('Please select a file to analyze.');
        return;
      }

      setFileError(null);
      setState({ type: 'LOADING', source: selectedFile.name });
      doFetchFile(selectedFile);
    }
  }, [inputMode, url, selectedFile, doFetchUrl, doFetchFile]);

  const handleRetry = useCallback(() => {
    if (state.type === 'ERROR') {
      setState({ type: 'LOADING', source: state.source });
      if (inputMode === 'url') {
        doFetchUrl(state.source);
      } else if (selectedFile) {
        doFetchFile(selectedFile);
      }
    }
  }, [state, inputMode, selectedFile, doFetchUrl, doFetchFile]);

  const handleEditUrl = useCallback(() => {
    if (state.type === 'ERROR') {
      if (inputMode === 'url') {
        setUrl(state.source);
      }
      setState({ type: 'INITIAL' });
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [state, inputMode]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && state.type !== 'LOADING') {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit, state.type]
  );

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg)]">
      <Header />
      <main className="flex flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12">
        {state.type === 'INITIAL' && (
          <LandingView
            url={url}
            onUrlChange={handleUrlChange}
            onKeyDown={handleKeyDown}
            onAnalyze={handleSubmit}
            onClear={resetToInitial}
            validationError={validationError}
            isLoading={false}
            inputRef={inputRef}
            inputMode={inputMode}
            onInputModeChange={handleInputModeChange}
            selectedFile={selectedFile}
            onFileSelect={handleFileSelect}
            fileError={fileError}
          />
        )}

        {state.type === 'LOADING' && (
          <LoadingView 
            source={state.source} 
            mode={inputMode} 
            onCancel={handleCancel} 
          />
        )}

        {state.type === 'ERROR' && (
          <ErrorView
            code={state.error.code}
            message={state.error.message}
            retryable={state.error.retryable}
            onRetry={handleRetry}
            onEditUrl={handleEditUrl}
            onClear={resetToInitial}
            inputMode={inputMode}
          />
        )}

        {state.type === 'SUCCESS' && (
          <ResultView
            data={state.data}
            previewUrl={previewUrl}
            onAnalyzeAnother={resetToInitial}
            onClear={resetToInitial}
          />
        )}
      </main>
    </div>
  );
}
