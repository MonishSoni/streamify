'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import axios from 'axios';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat } from 'lucide-react';

export default function StreamifyApp() {
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [songs, setSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [searchStatus, setSearchStatus] = useState('Search for songs to get started');
  const [currentSongIndex, setCurrentSongIndex] = useState(-1);
  const [currentTime, setCurrentTime] = useState(0); // Current playback time
  const [duration, setDuration] = useState(0); // Song duration
  const [page, setPage] = useState(1);

  // Refs
  const audioRef = useRef(null);

  // Handle volume change
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (isMuted && newVolume > 0) {
      setIsMuted(false);
    }
  };

  // Handle search submission
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setSearchStatus('');
    setSongs([]);
    setPage(1);

    try {
      const response = await axios.get(`https://saavn.dev/api/search/songs?query=${encodeURIComponent(searchQuery.trim())}&page=1`);
      const data = response.data;

      if (data.data?.results?.length > 0) {
        setSongs(data.data.results);
        setSearchStatus('');
      } else {
        setSearchStatus('No songs found. Try a different search.');
      }
    } catch (error) {
      console.error('Error fetching songs:', error);
      setSearchStatus('Error fetching songs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreSongs = async () => {
  if (isLoading || !searchQuery.trim()) return;

  setIsLoading(true);

  try {
    const nextPage = page + 1;
    const response = await axios.get(`https://saavn.dev/api/search/songs?query=${encodeURIComponent(searchQuery.trim())}&page=${nextPage}`);
    const data = response.data;

    if (data.data?.results?.length > 0) {
      setSongs(prev => [...prev, ...data.data.results]);
      setPage(nextPage);
    }
  } catch (error) {
    console.error('Error loading more songs:', error);
  } finally {
    setIsLoading(false);
  }
};

useEffect(() => {
  const handleScroll = () => {
    if (
      window.innerHeight + document.documentElement.scrollTop + 200 >=
      document.documentElement.offsetHeight
    ) {
      loadMoreSongs();
    }
  };

  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, [songs, page, isLoading, searchQuery]);



  // Handle song playback
  const playSong = (song, index) => {
    if (!song) return;

    setCurrentSong(song);
    setCurrentSongIndex(index);
    setIsPlaying(true);
  };

  // Utility function to get safe image URL (500x500)
  const getSafeImageUrl = (song) => {
    if (song?.image && Array.isArray(song.image) && song.image.length > 0) {
      const imageUrl = song.image.find(img => img.quality === '500x500')?.url;

      if (imageUrl && imageUrl.startsWith('http:')) {
        return imageUrl.replace('http:', 'https:');
      }

      return imageUrl || '/api/placeholder/250/250'; // Default fallback image
    }

    return '/api/placeholder/250/250';
  };

  // Handle play/pause toggle
  const togglePlayPause = () => {
    if (!currentSong) {
      if (songs.length > 0) {
        playSong(songs[0], 0);
      }
      return;
    }

    setIsPlaying(!isPlaying);
  };

  // Handle previous song
  const playPrevious = () => {
    if (songs.length === 0) return;

    let prevIndex = currentSongIndex - 1;
    if (prevIndex < 0) {
      prevIndex = songs.length - 1;
    }

    playSong(songs[prevIndex], prevIndex);
  };

  // Handle next song
  const playNext = () => {
    if (songs.length === 0) return;

    let nextIndex = currentSongIndex + 1;
    if (nextIndex >= songs.length) {
      nextIndex = 0;
    }

    playSong(songs[nextIndex], nextIndex);
  };

  // Toggle loop
  const toggleLoop = () => {
    setIsLooping(!isLooping);
  };

  // Toggle mute
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  // Handle audio playback when current song changes
  useEffect(() => {
    if (currentSong && audioRef.current) {
      const downloadUrl = currentSong.downloadUrl?.find(download => download.quality === "320kbps")?.url;

      if (downloadUrl) {
        audioRef.current.pause();
        audioRef.current.src = downloadUrl;

        if (isPlaying) {
          setTimeout(() => {
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
              playPromise.catch(error => {
                console.error('Error playing audio:', error);
              });
            }
          }, 100);
        }
      }
    }
  }, [currentSong, isPlaying]);

  // Effect to handle play/pause
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error('Error playing audio:', error);
            setIsPlaying(false);
          });
        }
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Effect to handle volume and mute changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Effect to handle song time update
  useEffect(() => {
    const updateTime = () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
        setDuration(audioRef.current.duration);
      }
    };

    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [currentSong]);

  // Handle song end
  const handleSongEnd = () => {
    if (!isLooping) {
      playNext();
    }
  };

  // Handle seek change
  const handleSeekChange = (e) => {
    const seekTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
    }
    setCurrentTime(seekTime);
  };

  // Format time in minutes:seconds
  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-20">
      {/* Logo */}
      <div className="w-full flex justify-center pt-8">
        <svg className="w-60 h-16" viewBox="0 0 240 60" xmlns="http://www.w3.org/2000/svg">
          {/* Sound wave elements */}
          <path d="M50 10 L50 50" stroke="#1DB954" strokeWidth="4" strokeLinecap="round">
            <animate attributeName="d" values="M50 25 L50 35; M50 15 L50 45; M50 25 L50 35" dur="1.5s" repeatCount="indefinite" />
          </path>
          <path d="M60 15 L60 45" stroke="#1DB954" strokeWidth="4" strokeLinecap="round">
            <animate attributeName="d" values="M60 15 L60 45; M60 10 L60 50; M60 15 L60 45" dur="2s" repeatCount="indefinite" />
          </path>
          <path d="M70 20 L70 40" stroke="#1DB954" strokeWidth="4" strokeLinecap="round">
            <animate attributeName="d" values="M70 20 L70 40; M70 5 L70 55; M70 20 L70 40" dur="1.2s" repeatCount="indefinite" />
          </path>
          <path d="M80 25 L80 35" stroke="#1DB954" strokeWidth="4" strokeLinecap="round">
            <animate attributeName="d" values="M80 25 L80 35; M80 15 L80 45; M80 25 L80 35" dur="1.8s" repeatCount="indefinite" />
          </path>

          {/* Text elements */}
          <text x="90" y="40" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="28" fill="#ffffff">
            Streamify
          </text>

          {/* Music note */}
          <path d="M30 20 Q30 15, 35 15 L40 15 L40 35 Q40 40, 35 40 Q30 40, 30 35 Q30 30, 35 30 L40 30"
            fill="none" stroke="#1DB954" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Search container */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-center my-10">
          <form onSubmit={handleSearch} className="w-full max-w-md">
            <input
              type="text"
              className="w-full bg-gray-800 text-white px-6 py-4 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Search for songs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
        </div>

        {/* Status messages */}
        {isLoading && (
          <div className="text-center text-gray-400 my-8">
            Searching for songs...
          </div>
        )}

        {!isLoading && searchStatus && (
          <div className="text-center text-gray-400 my-8">
            {searchStatus}
          </div>
        )}

        {/* Songs grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-8 pb-10">
          {songs.map((song, index) => {
            const thumbnail = getSafeImageUrl(song);

            return (
              <div key={`${song.id}-${index}`} className="relative group">

                <div
                  className="bg-gray-800 rounded-md overflow-hidden transition-all duration-300 transform hover:bg-gray-700 hover:-translate-y-1 cursor-pointer"
                  onClick={() => playSong(song, index)}
                >
                  <div className="relative aspect-square">
                    <Image
                      src={thumbnail}
                      alt={song.name || "Album cover"}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      className="object-cover"
                      onError={(e) => {
                        const target = e.target;
                        if (target.src !== '/api/placeholder/250/250') {
                          target.src = '/api/placeholder/250/250';
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <button className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                        <Play className="h-6 w-6 text-white" />
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-white truncate">{song.name}</h3>
                    <p className="text-gray-400 text-sm mt-1 truncate">{song.artist?.primary?.name}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Player controls */}
      <div className={`fixed bottom-0 left-0 w-full bg-gray-800 border-t border-gray-700 transition-transform duration-300 ${currentSong ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="max-w-6xl mx-auto px-4 py-3">
          {/* Currently playing */}
          <div className="flex items-center flex-1 min-w-0 mb-2">
            {currentSong && (
              <>
                <div className="relative w-14 h-14 mr-4">
                  <Image
                    src={getSafeImageUrl(currentSong)}
                    alt={currentSong.name || "Now playing"}
                    fill
                    sizes="56px"
                    className="rounded object-cover"
                    onError={(e) => {
                      const target = e.target;
                      if (target.src !== '/api/placeholder/56/56') {
                        target.src = '/api/placeholder/56/56';
                      }
                    }}
                  />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold truncate">{currentSong.name}</div>
                  <div className="text-gray-400 text-sm truncate">{currentSong.artist?.primary?.name}</div>
                </div>
              </>
            )}
          </div>

          {/* Seek bar with time indicators */}
          {currentSong && (
            <div className="flex items-center space-x-2 mb-3">
              <span className="text-xs text-gray-400 w-10 text-right">{formatTime(currentTime)}</span>
              <div className="flex-1">
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  step="0.01"
                  value={currentTime}
                  onChange={handleSeekChange}
                  className="w-full h-1 accent-green-500"
                />
              </div>
              <span className="text-xs text-gray-400 w-10">{formatTime(duration)}</span>
            </div>
          )}

          {/* Controls row */}
          <div className="flex items-center justify-between">
            {/* Main controls */}
            <div className="flex items-center space-x-6 mx-auto">
              <button onClick={playPrevious} className="text-gray-400 hover:text-white focus:outline-none">
                <SkipBack className="h-6 w-6" />
              </button>

              <button onClick={togglePlayPause} className="w-10 h-10 bg-white rounded-full flex items-center justify-center focus:outline-none">
                {isPlaying ? (
                  <Pause className="h-5 w-5 text-gray-900" />
                ) : (
                  <Play className="h-5 w-5 text-gray-900" />
                )}
              </button>

              <button onClick={playNext} className="text-gray-400 hover:text-white focus:outline-none">
                <SkipForward className="h-6 w-6" />
              </button>

              <button onClick={toggleLoop} className={`focus:outline-none ${isLooping ? 'text-green-500' : 'text-gray-400 hover:text-white'}`}>
                <Repeat className="h-5 w-5" />
              </button>
            </div>

            {/* Volume controls */}
            <div className="flex items-center ml-6 space-x-2">
              <button onClick={toggleMute} className="text-gray-400 hover:text-white focus:outline-none">
                {isMuted ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                className="w-24 accent-green-500"
                disabled={isMuted}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Audio element */}
      <audio ref={audioRef} onEnded={handleSongEnd} className="hidden" />
    </div>
  );
}