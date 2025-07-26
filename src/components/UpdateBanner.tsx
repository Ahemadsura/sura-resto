import React, { useEffect, useState } from 'react';
import { Alert, Button, Collapse, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const CURRENT_VERSION = "0.1.0"; // Hard-coded version to avoid build issues

interface LatestVersion {
  latestVersion: string;
  changelog: string;
  downloadUrl: string;
}

const UpdateBanner: React.FC = () => {
  const [latest, setLatest] = useState<LatestVersion | null>(null);
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (window.electronAPI && window.electronAPI.checkLatestVersion) {
      window.electronAPI.checkLatestVersion().then((data: LatestVersion | null) => {
        if (data && data.latestVersion && data.latestVersion !== CURRENT_VERSION) {
          setLatest(data);
        }
      });
    }
  }, []);

  if (!latest || !show) return null;

  return (
    <Collapse in={show}>
      <Alert
        icon={false}
        severity="info"
        className="flex flex-col md:flex-row items-center justify-between gap-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg rounded-none border-0"
        action={
          <IconButton
            aria-label="close"
            color="inherit"
            size="small"
            onClick={() => setShow(false)}
          >
            <CloseIcon fontSize="inherit" />
          </IconButton>
        }
      >
        <div className="flex-1">
          <Typography variant="h6" className="font-bold">New version available</Typography>
          <Typography variant="body2" className="mt-1">{latest.changelog}</Typography>
          <Typography variant="caption" className="block mt-2">Current version: {CURRENT_VERSION} &nbsp;|&nbsp; Latest: {latest.latestVersion}</Typography>
        </div>
        <Button
          variant="contained"
          color="secondary"
          className="mt-2 md:mt-0"
          onClick={() => window.electronAPI?.openExternal(latest.downloadUrl)}
        >
          Download
        </Button>
      </Alert>
    </Collapse>
  );
};

export default UpdateBanner; 