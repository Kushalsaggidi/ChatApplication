import React, { useRef, useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  Image,
  Text,
  VStack,
  HStack,
  Progress,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Badge,
  Flex
} from '@chakra-ui/react';
import { AttachmentIcon, CloseIcon } from '@chakra-ui/icons';

const FileUpload = ({ onFilesSelect, onRemoveFile, selectedFiles = [] }) => {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const handleFiles = (files) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|mp4|mp3|zip/;
      
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: `${file.name} is larger than 10MB`,
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return false;
      }
      
      if (!allowedTypes.test(file.type)) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a supported file type`,
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return false;
      }
      
      return true;
    });

    if (validFiles.length > 0) {
      onFilesSelect(validFiles);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('video/')) return '🎥';
    if (fileType.includes('audio/')) return '🎵';
    if (fileType.includes('zip')) return '📦';
    return '📎';
  };

  return (
    <>
      <Box
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        p={2}
        border="2px dashed"
        borderColor={dragActive ? "blue.300" : "gray.300"}
        borderRadius="md"
        bg={dragActive ? "blue.50" : "gray.50"}
        transition="all 0.2s"
        cursor="pointer"
        onClick={() => fileInputRef.current?.click()}
        _hover={{ borderColor: "blue.400", bg: "blue.50" }}
      >
        <VStack spacing={2}>
          <AttachmentIcon boxSize={6} color="gray.500" />
          <Text fontSize="sm" color="gray.600" textAlign="center">
            Drag & drop files here or click to browse
          </Text>
          <Text fontSize="xs" color="gray.500">
            Max 10MB per file • Images, PDFs, Documents, Videos
          </Text>
        </VStack>
      </Box>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleChange}
        style={{ display: 'none' }}
        accept="image/*,application/pdf,.doc,.docx,.txt,.mp4,.mp3,.zip"
      />

      {selectedFiles.length > 0 && (
        <Box mt={3}>
          <Text fontSize="sm" fontWeight="bold" mb={2}>
            Selected Files ({selectedFiles.length})
          </Text>
          <VStack spacing={2} align="stretch">
            {selectedFiles.map((file, index) => (
              <Box
                key={index}
                p={3}
                bg="white"
                borderRadius="md"
                border="1px solid"
                borderColor="gray.200"
                shadow="sm"
              >
                <Flex justify="space-between" align="center">
                  <HStack spacing={3}>
                    <Text fontSize="lg">{getFileIcon(file.type)}</Text>
                    <VStack align="start" spacing={0}>
                      <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                        {file.name}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {formatFileSize(file.size)}
                      </Text>
                    </VStack>
                  </HStack>
                  <IconButton
                    size="sm"
                    icon={<CloseIcon />}
                    onClick={() => onRemoveFile(index)}
                    aria-label="Remove file"
                    colorScheme="red"
                    variant="ghost"
                  />
                </Flex>
              </Box>
            ))}
          </VStack>
        </Box>
      )}

      {/* Image Preview Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Image Preview</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {selectedFiles
              .filter(file => file.type.startsWith('image/'))
              .map((file, index) => (
                <Box key={index} mb={4}>
                  <Image
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    maxH="400px"
                    mx="auto"
                    borderRadius="md"
                  />
                </Box>
              ))}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default FileUpload;
